import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { trades, tradeActions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth/user";
import { updateCashBalanceForTrade } from "@/lib/trades/cash-balance";

type RouteContext = {
  params: Promise<{ id: string; actionId: string }>;
};

/**
 * PATCH /api/trades/[id]/actions/[actionId] - 매매 내역 수정
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const body = await request.json();
    const { price, quantity, actionDate, note } = body;

    const userId = getUserIdFromRequest(request);

    // 매매 소유권 확인
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

    // 업데이트할 필드 구성
    const updateData: Partial<{
      price: string;
      quantity: number;
      actionDate: Date;
      note: string | null;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (price !== undefined) {
      if (typeof price !== "number" || price <= 0) {
        return NextResponse.json(
          { error: "가격은 0보다 커야 합니다" },
          { status: 400 }
        );
      }
      updateData.price = price.toString();
    }

    if (quantity !== undefined) {
      if (typeof quantity !== "number" || quantity <= 0) {
        return NextResponse.json(
          { error: "수량은 0보다 커야 합니다" },
          { status: 400 }
        );
      }
      updateData.quantity = quantity;
    }

    if (actionDate !== undefined) {
      updateData.actionDate = new Date(actionDate);
    }

    if (note !== undefined) {
      updateData.note = note || null;
    }

    // 수정
    await db
      .update(tradeActions)
      .set(updateData)
      .where(eq(tradeActions.id, actionIdNum));

    // 매매 updatedAt 업데이트
    await db
      .update(trades)
      .set({ updatedAt: new Date() })
      .where(eq(trades.id, tradeId));

    // 현금 잔액 재계산 (액션 수정 시)
    const commissionRate = trade.commissionRate
      ? parseFloat(trade.commissionRate)
      : 0.07;
    try {
      await updateCashBalanceForTrade(userId, tradeId, commissionRate);
    } catch (error) {
      console.error("[Actions API] Cash balance update failed:", error);
      // 현금 업데이트 실패해도 액션 수정은 성공했으므로 계속 진행
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Actions API] PATCH error:", error);
    return NextResponse.json({ error: "매매 내역 수정 실패" }, { status: 500 });
  }
}

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

    const userId = getUserIdFromRequest(request);

    // 매매 소유권 및 상태 확인
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

    // 최소 1개 액션 확인
    const allActions = await db
      .select()
      .from(tradeActions)
      .where(eq(tradeActions.tradeId, tradeId));

    if (allActions.length <= 1) {
      return NextResponse.json(
        { error: "최소 1개의 매매 내역이 필요합니다" },
        { status: 400 }
      );
    }

    // 삭제
    await db.delete(tradeActions).where(eq(tradeActions.id, actionIdNum));

    // updatedAt 업데이트
    await db
      .update(trades)
      .set({ updatedAt: new Date() })
      .where(eq(trades.id, tradeId));

    // 현금 잔액 재계산 (액션 삭제 시)
    const commissionRate = trade.commissionRate
      ? parseFloat(trade.commissionRate)
      : 0.07;
    try {
      await updateCashBalanceForTrade(userId, tradeId, commissionRate);
    } catch (error) {
      console.error("[Actions API] Cash balance update failed:", error);
      // 현금 업데이트 실패해도 액션 삭제는 성공했으므로 계속 진행
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Actions API] DELETE error:", error);
    return NextResponse.json({ error: "매매 내역 삭제 실패" }, { status: 500 });
  }
}
