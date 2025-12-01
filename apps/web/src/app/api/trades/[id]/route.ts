import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { trades, tradeActions, symbols, dailyPrices } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { calculateTradeMetrics } from "@/lib/trades/calculations";
import { UpdateTradeRequest, TradeWithDetails } from "@/lib/trades/types";
import { getUserIdFromRequest } from "@/lib/auth/user";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/trades/[id] - 매매 상세 조회
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

    // 매매 조회
    const [tradeResult] = await db
      .select({
        trade: trades,
        companyName: symbols.companyName,
        sector: symbols.sector,
      })
      .from(trades)
      .leftJoin(symbols, eq(trades.symbol, symbols.symbol))
      .where(and(eq(trades.id, tradeId), eq(trades.userId, userId)));

    if (!tradeResult) {
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

    // 현재가 조회
    const latestPrice = await db
      .select({ close: dailyPrices.close })
      .from(dailyPrices)
      .where(eq(dailyPrices.symbol, tradeResult.trade.symbol))
      .orderBy(desc(dailyPrices.date))
      .limit(1);

    const currentPrice = latestPrice[0]?.close
      ? parseFloat(latestPrice[0].close)
      : null;

    // 계산값 (수수료율 적용)
    const commissionRate = tradeResult.trade.commissionRate
      ? parseFloat(tradeResult.trade.commissionRate)
      : undefined;
    const calculated = calculateTradeMetrics(
      actions,
      tradeResult.trade.planStopLoss,
      commissionRate
    );

    const result: TradeWithDetails = {
      ...tradeResult.trade,
      actions,
      calculated,
      symbolInfo: {
        companyName: tradeResult.companyName,
        sector: tradeResult.sector,
        currentPrice,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Trades API] GET [id] error:", error);
    return NextResponse.json({ error: "매매 상세 조회 실패" }, { status: 500 });
  }
}

/**
 * PATCH /api/trades/[id] - 매매 수정
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const tradeId = parseInt(id, 10);

    if (isNaN(tradeId)) {
      return NextResponse.json(
        { error: "유효하지 않은 ID입니다" },
        { status: 400 }
      );
    }

    const body: UpdateTradeRequest = await request.json();
    const userId = getUserIdFromRequest(request);

    // 매매 존재 확인
    const [existingTrade] = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, tradeId), eq(trades.userId, userId)));

    if (!existingTrade) {
      return NextResponse.json(
        { error: "매매를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 업데이트할 필드 구성
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.strategy !== undefined) {
      updateData.strategy = body.strategy;
    }
    if (body.planEntryPrice !== undefined) {
      updateData.planEntryPrice = body.planEntryPrice?.toString() || null;
    }
    if (body.planStopLoss !== undefined) {
      updateData.planStopLoss = body.planStopLoss?.toString() || null;
    }
    if (body.planTargetPrice !== undefined) {
      updateData.planTargetPrice = body.planTargetPrice?.toString() || null;
    }
    if (body.entryReason !== undefined) {
      updateData.entryReason = body.entryReason;
    }
    if (body.mistakeType !== undefined) {
      updateData.mistakeType = body.mistakeType;
    }
    if (body.reviewNote !== undefined) {
      updateData.reviewNote = body.reviewNote;
    }

    // 업데이트
    const [updatedTrade] = await db
      .update(trades)
      .set(updateData)
      .where(eq(trades.id, tradeId))
      .returning();

    return NextResponse.json(updatedTrade);
  } catch (error) {
    console.error("[Trades API] PATCH [id] error:", error);
    return NextResponse.json({ error: "매매 수정 실패" }, { status: 500 });
  }
}

/**
 * DELETE /api/trades/[id] - 매매 삭제
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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

    // 매매 존재 확인 (소유권 포함)
    const [existingTrade] = await db
      .select()
      .from(trades)
      .where(and(eq(trades.id, tradeId), eq(trades.userId, userId)));

    if (!existingTrade) {
      return NextResponse.json(
        { error: "매매를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 삭제 (CASCADE로 액션도 함께 삭제됨)
    await db.delete(trades).where(eq(trades.id, tradeId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Trades API] DELETE [id] error:", error);
    return NextResponse.json({ error: "매매 삭제 실패" }, { status: 500 });
  }
}
