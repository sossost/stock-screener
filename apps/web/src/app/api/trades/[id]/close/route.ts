import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { trades, tradeActions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateFinalResults, isFullySold } from "@/lib/trades/calculations";
import { CloseTradeRequest } from "@/lib/trades/types";
import { getUserIdFromRequest } from "@/lib/auth/user";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/trades/[id]/close - 매매 종료
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tradeId = parseInt(id, 10);

    if (isNaN(tradeId)) {
      return NextResponse.json(
        { error: "유효하지 않은 ID입니다" },
        { status: 400 }
      );
    }

    const body: CloseTradeRequest = await request.json();
    const userId = getUserIdFromRequest(request);

    // 매매 존재 및 상태 확인
    const [trade] = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, tradeId), eq(trades.userId, userId)));

    if (!trade) {
      return NextResponse.json(
        { error: "매매를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (trade.status === "CLOSED") {
      return NextResponse.json(
        { error: "이미 종료된 매매입니다" },
        { status: 400 }
      );
    }

    // 액션 조회
    const actions = await db
      .select()
      .from(tradeActions)
      .where(eq(tradeActions.tradeId, tradeId))
      .orderBy(tradeActions.actionDate);

    // 전량 매도 여부 확인 (경고만, 강제는 아님)
    const fullySold = isFullySold(actions);
    if (!fullySold) {
      // 보유 중인 상태에서 종료하려는 경우 - 허용하지만 결과는 실현 손익만 계산
      console.warn(
        `[Trades API] Trade ${tradeId} closed with remaining position`
      );
    }

    // 최종 결과 계산 (수수료율 적용)
    const commissionRate = trade.commissionRate
      ? parseFloat(trade.commissionRate)
      : undefined;
    const finalResults = calculateFinalResults(
      actions,
      trade.planStopLoss,
      commissionRate
    );

    // 매매 종료 업데이트
    const [closedTrade] = await db
      .update(trades)
      .set({
        status: "CLOSED",
        finalPnl: finalResults.finalPnl.toString(),
        finalRoi: finalResults.finalRoi.toString(),
        finalRMultiple: finalResults.finalRMultiple?.toString() || null,
        mistakeType: body.mistakeType || null,
        reviewNote: body.reviewNote || null,
        endDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(trades.id, tradeId))
      .returning();

    return NextResponse.json({
      ...closedTrade,
      calculated: finalResults,
      warning: !fullySold
        ? "보유 중인 수량이 남아있는 상태로 매매가 종료되었습니다"
        : undefined,
    });
  } catch (error) {
    console.error("[Trades API] close error:", error);
    return NextResponse.json(
      { error: "매매 종료 실패" },
      { status: 500 }
    );
  }
}

