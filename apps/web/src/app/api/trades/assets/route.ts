import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { assetSnapshots, trades, tradeActions } from "@/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth/user";
import {
  calculateTradeMetrics,
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
    const pnlByDate = new Map<string, number>();

    for (const trade of allTradesList) {
      const actions = actionsByTradeId.get(trade.id) || [];

      // 매도 액션이 없으면 스킵
      const hasSellActions = actions.some((a) => a.actionType === "SELL");
      if (!hasSellActions) continue;

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

      // 완료된 거래: endDate 기준
      // 진행중인 거래: 마지막 매도 액션 날짜 기준
      let dateToUse: Date;
      if (trade.status === "CLOSED" && trade.endDate) {
        dateToUse = new Date(trade.endDate);
      } else {
        // 진행중인 거래: 마지막 매도 액션 날짜 사용
        const sellActions = actions
          .filter((a) => a.actionType === "SELL")
          .sort(
            (a, b) =>
              new Date(b.actionDate).getTime() -
              new Date(a.actionDate).getTime()
          );
        if (sellActions.length === 0) continue;
        dateToUse = new Date(sellActions[0].actionDate);
      }

      // 날짜 문자열로 변환 (YYYY-MM-DD)
      const dateStr = dateToUse.toISOString().split("T")[0];
      const currentPnl = pnlByDate.get(dateStr) || 0;
      pnlByDate.set(dateStr, currentPnl + calculated.realizedPnl);
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
