import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { trades, tradeActions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const DEFAULT_USER_ID = "0";

type RouteContext = {
  params: Promise<{ id: string; actionId: string }>;
};

/**
 * DELETE /api/trades/[id]/actions/[actionId] - 매매 내역 삭제
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id, actionId } = await context.params;
    const tradeId = parseInt(id, 10);
    const actionIdNum = parseInt(actionId, 10);

    if (isNaN(tradeId) || isNaN(actionIdNum)) {
      return NextResponse.json(
        { error: "유효하지 않은 ID입니다" },
        { status: 400 }
      );
    }

    // 매매 소유권 및 상태 확인
    const [trade] = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, tradeId), eq(trades.userId, DEFAULT_USER_ID)));

    if (!trade) {
      return NextResponse.json(
        { error: "매매를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (trade.status === "CLOSED") {
      return NextResponse.json(
        { error: "종료된 매매의 내역은 삭제할 수 없습니다" },
        { status: 400 }
      );
    }

    // 액션 존재 확인
    const [action] = await db
      .select()
      .from(tradeActions)
      .where(
        and(eq(tradeActions.id, actionIdNum), eq(tradeActions.tradeId, tradeId))
      );

    if (!action) {
      return NextResponse.json(
        { error: "매매 내역을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 삭제
    await db.delete(tradeActions).where(eq(tradeActions.id, actionIdNum));

    // updatedAt 업데이트
    await db
      .update(trades)
      .set({ updatedAt: new Date() })
      .where(eq(trades.id, tradeId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Actions API] DELETE error:", error);
    return NextResponse.json({ error: "매매 내역 삭제 실패" }, { status: 500 });
  }
}
