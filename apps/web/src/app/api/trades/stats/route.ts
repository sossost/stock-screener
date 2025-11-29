import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { trades, tradeActions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateTradeStats } from "@/lib/trades/calculations";

const DEFAULT_USER_ID = "0";

/**
 * GET /api/trades/stats - 매매 통계 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 매매 조회 (CLOSED만)
    const conditions = [
      eq(trades.userId, DEFAULT_USER_ID),
      eq(trades.status, "CLOSED"),
    ];

    const tradeList = await db
      .select()
      .from(trades)
      .where(and(...conditions));

    // 기간 필터 적용
    let filteredTrades = tradeList;
    if (startDate) {
      const start = new Date(startDate);
      filteredTrades = filteredTrades.filter(
        (t) => t.endDate && new Date(t.endDate) >= start
      );
    }
    if (endDate) {
      const end = new Date(endDate);
      filteredTrades = filteredTrades.filter(
        (t) => t.endDate && new Date(t.endDate) <= end
      );
    }

    // 각 매매의 액션 조회
    const tradesWithActions = await Promise.all(
      filteredTrades.map(async (trade) => {
        const actions = await db
          .select()
          .from(tradeActions)
          .where(eq(tradeActions.tradeId, trade.id));
        return { ...trade, actions };
      })
    );

    // 통계 계산
    const stats = calculateTradeStats(tradesWithActions);

    // OPEN 매매 수도 포함
    const openTradesCount = await db
      .select()
      .from(trades)
      .where(
        and(eq(trades.userId, DEFAULT_USER_ID), eq(trades.status, "OPEN"))
      );

    return NextResponse.json({
      ...stats,
      openTrades: openTradesCount.length,
    });
  } catch (error) {
    console.error("[Trades Stats API] error:", error);
    return NextResponse.json(
      { error: "통계 조회 실패" },
      { status: 500 }
    );
  }
}

