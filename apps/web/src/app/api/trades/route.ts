import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { trades, tradeActions, symbols, dailyPrices } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { calculateTradeMetrics } from "@/lib/trades/calculations";
import {
  CreateTradeRequest,
  TradeListFilter,
  TradeListItem,
} from "@/lib/trades/types";

const SYMBOL_REGEX = /^[A-Z]{1,5}$/;
const DEFAULT_USER_ID = "0";

/**
 * GET /api/trades - 매매 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as TradeListFilter["status"];
    const symbol = searchParams.get("symbol");

    // 필터 조건 구성
    const conditions = [eq(trades.userId, DEFAULT_USER_ID)];
    if (status) {
      conditions.push(eq(trades.status, status));
    }
    if (symbol) {
      conditions.push(eq(trades.symbol, symbol));
    }

    // 매매 목록 조회
    const tradeList = await db
      .select({
        trade: trades,
        companyName: symbols.companyName,
      })
      .from(trades)
      .leftJoin(symbols, eq(trades.symbol, symbols.symbol))
      .where(and(...conditions))
      .orderBy(desc(trades.startDate), desc(trades.createdAt));

    // 각 매매의 액션과 현재가 조회
    const result: TradeListItem[] = await Promise.all(
      tradeList.map(async ({ trade, companyName }) => {
        // 액션 조회
        const actions = await db
          .select()
          .from(tradeActions)
          .where(eq(tradeActions.tradeId, trade.id))
          .orderBy(tradeActions.actionDate);

        // 현재가 조회 (최신 가격)
        const latestPrice = await db
          .select({ close: dailyPrices.close })
          .from(dailyPrices)
          .where(eq(dailyPrices.symbol, trade.symbol))
          .orderBy(desc(dailyPrices.date))
          .limit(1);

        const currentPrice = latestPrice[0]?.close
          ? parseFloat(latestPrice[0].close)
          : null;

        // 계산값 (수수료율 적용)
        const commissionRate = trade.commissionRate
          ? parseFloat(trade.commissionRate)
          : undefined;
        const calculated = calculateTradeMetrics(
          actions,
          trade.planStopLoss,
          commissionRate
        );

        return {
          ...trade,
          companyName,
          currentPrice,
          calculated: {
            avgEntryPrice: calculated.avgEntryPrice,
            currentQuantity: calculated.currentQuantity,
            realizedPnl: calculated.realizedPnl,
            realizedRoi: calculated.realizedRoi,
          },
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Trades API] GET error:", error);
    return NextResponse.json(
      { error: "매매 목록 조회 실패" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trades - 신규 매매 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateTradeRequest = await request.json();

    // 입력 검증
    if (!body.symbol) {
      return NextResponse.json(
        { error: "종목 심볼은 필수입니다" },
        { status: 400 }
      );
    }

    if (!SYMBOL_REGEX.test(body.symbol)) {
      return NextResponse.json(
        { error: "유효하지 않은 심볼 형식입니다" },
        { status: 400 }
      );
    }

    // 심볼 존재 확인
    const symbolExists = await db
      .select({ symbol: symbols.symbol })
      .from(symbols)
      .where(eq(symbols.symbol, body.symbol))
      .limit(1);

    if (symbolExists.length === 0) {
      return NextResponse.json(
        { error: "존재하지 않는 종목입니다" },
        { status: 404 }
      );
    }

    // 첫 매수가 있는 경우 검증
    if (body.firstAction) {
      if (body.firstAction.price <= 0) {
        return NextResponse.json(
          { error: "가격은 0보다 커야 합니다" },
          { status: 400 }
        );
      }
      if (body.firstAction.quantity <= 0) {
        return NextResponse.json(
          { error: "수량은 0보다 커야 합니다" },
          { status: 400 }
        );
      }
    }

    // 트랜잭션으로 매매 + 첫 액션 생성
    const result = await db.transaction(async (tx) => {
      const startDate = body.firstAction?.actionDate
        ? new Date(body.firstAction.actionDate)
        : new Date();

      // 매매 생성
      const [newTrade] = await tx
        .insert(trades)
        .values({
          userId: DEFAULT_USER_ID,
          symbol: body.symbol,
          status: "OPEN",
          strategy: body.strategy || null,
          planEntryPrice: body.planEntryPrice?.toString() || null,
          planStopLoss: body.planStopLoss?.toString() || null,
          planTargetPrice: body.planTargetPrice?.toString() || null,
          planTargets: body.planTargets || null,
          entryReason: body.entryReason || null,
          commissionRate: body.commissionRate?.toString() || "0.07",
          startDate,
        })
        .returning();

      // 첫 매수가 있으면 액션 생성
      if (body.firstAction) {
        await tx.insert(tradeActions).values({
          tradeId: newTrade.id,
          actionType: "BUY",
          actionDate: startDate,
          price: body.firstAction.price.toString(),
          quantity: body.firstAction.quantity,
          note: body.firstAction.note || null,
        });
      }

      return newTrade;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[Trades API] POST error:", error);
    return NextResponse.json(
      { error: "매매 생성 실패" },
      { status: 500 }
    );
  }
}

