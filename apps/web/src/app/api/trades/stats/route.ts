import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { trades, tradeActions } from "@/db/schema";
import { eq, and, gte, lte, inArray, count } from "drizzle-orm";
import {
  calculateTradeStats,
  calculateTradeMetrics,
} from "@/lib/trades/calculations";
import { getUserIdFromRequest } from "@/lib/auth/user";

/**
 * GET /api/trades/stats - 매매 통계 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // 날짜 유효성 검사
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (startDateParam) {
      startDate = new Date(startDateParam);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid startDate format" },
          { status: 400 }
        );
      }
    }

    if (endDateParam) {
      endDate = new Date(endDateParam);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid endDate format" },
          { status: 400 }
        );
      }
    }

    const userId = getUserIdFromRequest(request);

    // 완료된 거래 + 진행중인 거래(매도가 발생한 경우) 조회
    const conditions = [eq(trades.userId, userId)];

    // 날짜 필터링: 완료된 거래는 endDate 기준, 진행중인 거래는 startDate 기준
    if (startDate) {
      conditions.push(gte(trades.startDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(trades.startDate, endDate));
    }

    const allTradesList = await db
      .select()
      .from(trades)
      .where(and(...conditions));

    // N+1 쿼리 해결: 한 번에 모든 액션 조회
    const tradeIds = allTradesList.map((t) => t.id);
    const allActions =
      tradeIds.length > 0
        ? await db
            .select()
            .from(tradeActions)
            .where(inArray(tradeActions.tradeId, tradeIds))
        : [];

    // 액션을 tradeId별로 그룹화
    const actionsByTradeId = new Map<number, typeof allActions>();
    for (const action of allActions) {
      const existing = actionsByTradeId.get(action.tradeId) || [];
      existing.push(action);
      actionsByTradeId.set(action.tradeId, existing);
    }

    // 완료된 거래만 통계 계산에 포함 (진행중인 거래는 실현 손익만 별도 계산)
    const closedTradesWithActions = allTradesList
      .filter((trade) => trade.status === "CLOSED")
      .map((trade) => ({
        ...trade,
        actions: actionsByTradeId.get(trade.id) || [],
      }));

    // 통계 계산 (완료된 거래 기준)
    const stats = calculateTradeStats(closedTradesWithActions);

    // 진행중인 거래의 부분 매도 실현 손익도 통계에 추가
    const openTradesWithActions = allTradesList
      .filter((trade) => trade.status === "OPEN")
      .map((trade) => ({
        ...trade,
        actions: actionsByTradeId.get(trade.id) || [],
      }));

    // 진행중인 거래 중 매도가 발생한 거래의 실현 손익 합산
    let openTradesRealizedPnl = 0;
    for (const trade of openTradesWithActions) {
      const hasSellActions = trade.actions.some((a) => a.actionType === "SELL");
      if (!hasSellActions) continue;

      const commissionRate = trade.commissionRate
        ? parseFloat(trade.commissionRate)
        : 0.07;

      const calculated = calculateTradeMetrics(
        trade.actions,
        trade.planStopLoss,
        commissionRate
      );

      if (calculated.realizedPnl !== 0) {
        openTradesRealizedPnl += calculated.realizedPnl;
      }
    }

    // 총 실현 손익에 진행중인 거래의 실현 손익 추가
    const adjustedStats = {
      ...stats,
      totalPnl: stats.totalPnl + openTradesRealizedPnl,
    };

    // OPEN 매매 수 (count 사용)
    const [openTradesResult] = await db
      .select({ count: count() })
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.status, "OPEN")));

    return NextResponse.json({
      ...adjustedStats,
      openTrades: openTradesResult?.count ?? 0,
    });
  } catch (error) {
    console.error("[Trades Stats API] error:", error);
    return NextResponse.json({ error: "통계 조회 실패" }, { status: 500 });
  }
}
