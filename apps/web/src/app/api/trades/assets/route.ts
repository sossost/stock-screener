import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { assetSnapshots, trades, tradeActions } from "@/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth/user";
import {
  calculateTradeMetrics,
  calculateSellActionPnl,
  DEFAULT_COMMISSION_RATE,
} from "@/lib/trades/calculations";

const DAYS_IN_MONTH = 30;
const DAYS_IN_QUARTER = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * GET /api/trades/assets
 * 수익 흐름(PnL) 조회 (기간별) - 완료된 매매들의 실현손익 누적
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "1M"; // 1M, 3M, ALL

    // 기간 계산
    const now = new Date();
    let startDate: Date | null = null;

    switch (period) {
      case "1M":
        startDate = new Date(now.getTime() - DAYS_IN_MONTH * MS_PER_DAY);
        break;
      case "3M":
        startDate = new Date(now.getTime() - DAYS_IN_QUARTER * MS_PER_DAY);
        break;
      case "ALL":
      default:
        startDate = null;
    }

    const userId = getUserIdFromRequest(request);

    // 완료된 매매 + 진행중인 매매(매도가 발생한 경우) 조회
    const tradesConditions = [eq(trades.userId, userId)];
    if (startDate) {
      tradesConditions.push(gte(trades.startDate, startDate));
    }

    const allTradesList = await db
      .select({
        id: trades.id,
        status: trades.status,
        startDate: trades.startDate,
        endDate: trades.endDate,
        commissionRate: trades.commissionRate,
        planStopLoss: trades.planStopLoss,
        finalPnl: trades.finalPnl, // 통계 API와 동일하게 사용
      })
      .from(trades)
      .where(and(...tradesConditions))
      .orderBy(trades.startDate);

    if (allTradesList.length === 0) {
      return NextResponse.json([], {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    // 모든 액션 배치 조회
    const tradeIds = allTradesList.map((t) => t.id);
    const allTradeActions = await db
      .select()
      .from(tradeActions)
      .where(inArray(tradeActions.tradeId, tradeIds))
      .orderBy(tradeActions.actionDate);

    // 매매별로 액션 그룹핑
    const actionsByTradeId = new Map<number, typeof allTradeActions>();
    for (const action of allTradeActions) {
      const existing = actionsByTradeId.get(action.tradeId) || [];
      existing.push(action);
      actionsByTradeId.set(action.tradeId, existing);
    }

    // 날짜별 실현손익 계산
    // 통계 API와 동일한 방식: 완료된 거래는 finalPnl 사용, 진행중인 거래는 calculateTradeMetrics 사용
    const pnlByDate = new Map<string, number>();

    for (const trade of allTradesList) {
      const actions = actionsByTradeId.get(trade.id) || [];

      // 매도 액션이 없으면 스킵
      const hasSellActions = actions.some((a) => a.actionType === "SELL");
      if (!hasSellActions) continue;

      if (trade.status === "CLOSED") {
        // 완료된 거래: 통계 API와 동일하게 finalPnl 사용
        // 데이터 무결성 검증: CLOSED 거래는 반드시 finalPnl이 있어야 함
        if (!trade.finalPnl) {
          console.error(
            `[Data Integrity] CLOSED trade ${trade.id} missing finalPnl. Skipping.`
          );
          continue;
        }

        const finalPnl = parseFloat(trade.finalPnl);
        if (isNaN(finalPnl)) {
          console.error(
            `[Data Integrity] CLOSED trade ${trade.id} has invalid finalPnl: ${trade.finalPnl}. Skipping.`
          );
          continue;
        }

        if (finalPnl === 0) continue;

        // endDate에 실현손익 집계
        if (trade.endDate) {
          try {
            const endDate = new Date(trade.endDate);
            if (isNaN(endDate.getTime())) {
              console.error(
                `[Data Integrity] CLOSED trade ${trade.id} has invalid endDate: ${trade.endDate}. Skipping.`
              );
              continue;
            }

            const dateStr = endDate.toISOString().split("T")[0];
            const currentPnl = pnlByDate.get(dateStr) || 0;
            pnlByDate.set(dateStr, currentPnl + finalPnl);
          } catch (error) {
            console.error(
              `[Data Integrity] CLOSED trade ${trade.id} has invalid endDate: ${trade.endDate}. Skipping.`,
              error
            );
            continue;
          }
        }
      } else {
        // 진행중인 거래: calculateTradeMetrics로 계산 (통계 API와 동일)
        const commissionRate = trade.commissionRate
          ? parseFloat(trade.commissionRate) || DEFAULT_COMMISSION_RATE
          : DEFAULT_COMMISSION_RATE;
        const calculated = calculateTradeMetrics(
          actions,
          trade.planStopLoss,
          commissionRate
        );

        // 실현 손익이 없으면 스킵
        if (calculated.realizedPnl === 0) continue;

        // 날짜순으로 정렬
        const sortedActions = [...actions].sort(
          (a, b) =>
            new Date(a.actionDate).getTime() - new Date(b.actionDate).getTime()
        );

        // 매도 액션들을 날짜순으로 정렬
        const sellActions = sortedActions
          .filter((a) => a.actionType === "SELL")
          .map((a) => ({
            date: new Date(a.actionDate).toISOString().split("T")[0],
            price: parseFloat(a.price),
            quantity: a.quantity,
          }));

        if (sellActions.length === 0) continue;

        // 각 매도 액션별로 실현손익 계산 (통계 API와 동일한 방식)
        const sellActionPnls = calculateSellActionPnl(
          sellActions,
          calculated.avgEntryPrice,
          calculated.totalBuyAmount,
          calculated.totalSellQuantity,
          commissionRate
        );

        // 매도 날짜별로 실현손익 집계
        for (const { date, realizedPnl } of sellActionPnls) {
          const currentPnl = pnlByDate.get(date) || 0;
          pnlByDate.set(date, currentPnl + realizedPnl);
        }
      }
    }

    // 날짜별로 정렬하고 누적 계산
    const sortedDates = Array.from(pnlByDate.keys()).sort();
    let cumulativePnl = 0;
    const result = sortedDates.map((dateStr) => {
      cumulativePnl += pnlByDate.get(dateStr) || 0;
      return {
        date: new Date(dateStr).toISOString(),
        realizedPnl: cumulativePnl,
      };
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Failed to fetch PnL flow:", error);
    return NextResponse.json({ error: "수익 흐름 조회 실패" }, { status: 500 });
  }
}

/**
 * POST /api/trades/assets
 * 자산 스냅샷 저장/업데이트
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, totalAssets, cash, positionValue } = body;

    if (!date || totalAssets == null || cash == null || positionValue == null) {
      return NextResponse.json(
        { error: "date, totalAssets, cash, positionValue 필수" },
        { status: 400 }
      );
    }

    const snapshotDate = new Date(date);
    snapshotDate.setHours(0, 0, 0, 0);

    const userId = getUserIdFromRequest(request);

    // upsert
    await db
      .insert(assetSnapshots)
      .values({
        userId,
        date: snapshotDate,
        totalAssets: totalAssets.toString(),
        cash: cash.toString(),
        positionValue: positionValue.toString(),
      })
      .onConflictDoUpdate({
        target: [assetSnapshots.userId, assetSnapshots.date],
        set: {
          totalAssets: totalAssets.toString(),
          cash: cash.toString(),
          positionValue: positionValue.toString(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save asset snapshot:", error);
    return NextResponse.json(
      { error: "자산 스냅샷 저장 실패" },
      { status: 500 }
    );
  }
}
