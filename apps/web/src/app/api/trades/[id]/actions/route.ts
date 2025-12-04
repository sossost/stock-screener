import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { trades, tradeActions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  canSellQuantity,
  calculateTradeMetrics,
} from "@/lib/trades/calculations";
import { CreateActionRequest } from "@/lib/trades/types";
import { getUserIdFromRequest } from "@/lib/auth/user";
import { updateCashBalanceForTrade } from "@/lib/trades/cash-balance";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/trades/[id]/actions - 매매 내역 조회
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tradeId = parseInt(id, 10);

    if (isNaN(tradeId)) {
      return NextResponse.json(
        { error: "유효하지 않은 ID입니다" },
        { status: 400 }
      );
    }

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

    // 액션 조회
    const actions = await db
      .select()
      .from(tradeActions)
      .where(eq(tradeActions.tradeId, tradeId))
      .orderBy(tradeActions.actionDate);

    return NextResponse.json(actions);
  } catch (error) {
    console.error("[Actions API] GET error:", error);
    return NextResponse.json({ error: "매매 내역 조회 실패" }, { status: 500 });
  }
}

/**
 * POST /api/trades/[id]/actions - 매수/매도 추가
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

    const userId = getUserIdFromRequest(request);

    const body: CreateActionRequest = await request.json();

    // 입력 검증
    if (!body.actionType || !["BUY", "SELL"].includes(body.actionType)) {
      return NextResponse.json(
        { error: "actionType은 BUY 또는 SELL이어야 합니다" },
        { status: 400 }
      );
    }

    if (!body.price || body.price <= 0) {
      return NextResponse.json(
        { error: "가격은 0보다 커야 합니다" },
        { status: 400 }
      );
    }

    if (!body.quantity || body.quantity <= 0) {
      return NextResponse.json(
        { error: "수량은 0보다 커야 합니다" },
        { status: 400 }
      );
    }

    // 매매 존재 및 상태 확인 (소유권 포함)
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
        { error: "종료된 매매에는 내역을 추가할 수 없습니다" },
        { status: 400 }
      );
    }

    // 매도 시 보유 수량 확인
    if (body.actionType === "SELL") {
      const existingActions = await db
        .select()
        .from(tradeActions)
        .where(eq(tradeActions.tradeId, tradeId));

      if (!canSellQuantity(existingActions, body.quantity)) {
        return NextResponse.json(
          { error: "보유 수량을 초과하여 매도할 수 없습니다" },
          { status: 400 }
        );
      }
    }

    // 첫 매수인지 확인 (startDate 업데이트용)
    const existingActionsCount = await db
      .select()
      .from(tradeActions)
      .where(eq(tradeActions.tradeId, tradeId));

    const isFirstAction =
      existingActionsCount.length === 0 && body.actionType === "BUY";

    // 트랜잭션으로 액션 생성 및 자동 완료 처리
    const actionDate = body.actionDate ? new Date(body.actionDate) : new Date();
    const commissionRate = trade.commissionRate
      ? parseFloat(trade.commissionRate)
      : 0.07;

    const result = await db.transaction(async (tx) => {
      // 액션 생성
      const [newAction] = await tx
        .insert(tradeActions)
        .values({
          tradeId,
          actionType: body.actionType,
          actionDate,
          price: body.price.toString(),
          quantity: body.quantity,
          note: body.note || null,
        })
        .returning();

      // 모든 액션 조회하여 보유 수량 확인
      const allActions = await tx
        .select()
        .from(tradeActions)
        .where(eq(tradeActions.tradeId, tradeId))
        .orderBy(tradeActions.actionDate);

      const calculated = calculateTradeMetrics(
        allActions,
        trade.planStopLoss,
        commissionRate
      );

      // 보유 수량이 0이면 자동 완료 처리
      const shouldAutoClose = calculated.currentQuantity === 0;

      // 첫 매수면 startDate 업데이트
      if (isFirstAction) {
        await tx
          .update(trades)
          .set({
            startDate: actionDate,
            updatedAt: new Date(),
            ...(shouldAutoClose && {
              status: "CLOSED",
              endDate: actionDate,
            }),
          })
          .where(eq(trades.id, tradeId));
      } else {
        // updatedAt 업데이트 및 자동 완료 처리
        await tx
          .update(trades)
          .set({
            updatedAt: new Date(),
            ...(shouldAutoClose && {
              status: "CLOSED",
              endDate: actionDate,
            }),
          })
          .where(eq(trades.id, tradeId));
      }

      return { newAction, commissionRate };
    });

    // 현금 잔액 업데이트 (트랜잭션 외부에서 처리하여 실패해도 액션은 유지)
    try {
      await updateCashBalanceForTrade(userId, tradeId, result.commissionRate);
    } catch (error) {
      console.error("[Actions API] Cash balance update failed:", error);
      // 현금 업데이트 실패해도 액션은 성공했으므로 계속 진행
    }

    return NextResponse.json(result.newAction, { status: 201 });
  } catch (error) {
    console.error("[Actions API] POST error:", error);
    return NextResponse.json({ error: "매매 내역 추가 실패" }, { status: 500 });
  }
}
