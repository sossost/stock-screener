import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { trades, tradeActions } from "@/db/schema";
import { eq, and, gte, lte, inArray, count } from "drizzle-orm";
import { calculateTradeStats } from "@/lib/trades/calculations";

const DEFAULT_USER_ID = "0";

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

    // DB WHERE 절에서 직접 필터링
    const conditions = [
      eq(trades.userId, DEFAULT_USER_ID),
      eq(trades.status, "CLOSED"),
    ];

    if (startDate) {
      conditions.push(gte(trades.endDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(trades.endDate, endDate));
    }

    const tradeList = await db
      .select()
      .from(trades)
      .where(and(...conditions));

    // N+1 쿼리 해결: 한 번에 모든 액션 조회
    const tradeIds = tradeList.map((t) => t.id);
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

    const tradesWithActions = tradeList.map((trade) => ({
      ...trade,
      actions: actionsByTradeId.get(trade.id) || [],
    }));

    // 통계 계산
    const stats = calculateTradeStats(tradesWithActions);

    // OPEN 매매 수 (count 사용)
    const [openTradesResult] = await db
      .select({ count: count() })
      .from(trades)
      .where(
        and(eq(trades.userId, DEFAULT_USER_ID), eq(trades.status, "OPEN"))
      );

    return NextResponse.json({
      ...stats,
      openTrades: openTradesResult?.count ?? 0,
    });
  } catch (error) {
    console.error("[Trades Stats API] error:", error);
    return NextResponse.json({ error: "통계 조회 실패" }, { status: 500 });
  }
}
