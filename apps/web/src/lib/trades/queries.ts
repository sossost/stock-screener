import { db } from "@/db/client";
import {
  trades,
  tradeActions,
  symbols,
  dailyPrices,
  portfolioSettings,
} from "@/db/schema";
import { eq, desc, and, inArray, sql, count } from "drizzle-orm";
import { getUserIdFromCookies } from "@/lib/auth/user";
import {
  calculateTradeMetrics,
  calculateHoldingDays,
} from "@/lib/trades/calculations";
import {
  TradeStatus,
  TradeListItem,
  TradeWithDetails,
} from "@/lib/trades/types";

/**
 * 매매 목록 조회 (서버 컴포넌트용)
 * N+1 쿼리 방지: 배치 조회 후 메모리에서 그룹핑
 */
export async function getTradesList(
  status?: TradeStatus,
  symbol?: string
): Promise<TradeListItem[]> {
  const userId = await getUserIdFromCookies();
  const conditions = [eq(trades.userId, userId)];
  if (status) {
    conditions.push(eq(trades.status, status));
  }
  if (symbol) {
    conditions.push(eq(trades.symbol, symbol));
  }

  const tradeList = await db
    .select({
      trade: trades,
      companyName: symbols.companyName,
    })
    .from(trades)
    .leftJoin(symbols, eq(trades.symbol, symbols.symbol))
    .where(and(...conditions))
    .orderBy(desc(trades.startDate), desc(trades.createdAt));

  if (tradeList.length === 0) {
    return [];
  }

  // 배치 조회: 모든 tradeActions 한번에 조회
  const tradeIds = tradeList.map((t) => t.trade.id);
  const allActions = await db
    .select()
    .from(tradeActions)
    .where(inArray(tradeActions.tradeId, tradeIds))
    .orderBy(tradeActions.actionDate);

  // 메모리에서 그룹핑
  const actionsByTradeId = new Map<number, typeof allActions>();
  for (const action of allActions) {
    const existing = actionsByTradeId.get(action.tradeId) || [];
    existing.push(action);
    actionsByTradeId.set(action.tradeId, existing);
  }

  // 배치 조회: 심볼별 최신 가격 및 전일 가격 (윈도우 함수로 최적화)
  const uniqueSymbols = [...new Set(tradeList.map((t) => t.trade.symbol))];

  if (uniqueSymbols.length === 0) {
    // 심볼이 없으면 빈 결과 반환
    return tradeList.map(({ trade, companyName }) => {
      const actions = actionsByTradeId.get(trade.id) || [];
      const commissionRate = trade.commissionRate
        ? parseFloat(trade.commissionRate)
        : undefined;
      const calculated = calculateTradeMetrics(
        actions,
        trade.planStopLoss,
        commissionRate
      );

      const holdingDays =
        trade.status === "CLOSED"
          ? calculateHoldingDays(trade.startDate, trade.endDate)
          : undefined;

      return {
        ...trade,
        companyName,
        currentPrice: null,
        priceChangePercent: null,
        calculated: {
          avgEntryPrice: calculated.avgEntryPrice,
          currentQuantity: calculated.currentQuantity,
          realizedPnl: calculated.realizedPnl,
          realizedRoi: calculated.realizedRoi,
          totalBuyQuantity: calculated.totalBuyQuantity,
          totalSellQuantity: calculated.totalSellQuantity,
          avgExitPrice: calculated.avgExitPrice,
          totalCommission: calculated.totalCommission,
          holdingDays,
        },
      };
    });
  }

  // 최신 가격 및 전일 가격을 한 번의 쿼리로 조회 (윈도우 함수 사용)
  const priceData = await db.execute(sql`
    WITH ranked_prices AS (
      SELECT
        symbol,
        close,
        date,
        ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) AS rn
      FROM daily_prices
      WHERE symbol IN (${sql.join(
        uniqueSymbols.map((s) => sql`${s}`),
        sql`, `
      )})
    )
    SELECT
      symbol,
      MAX(CASE WHEN rn = 1 THEN close END) AS latest_close,
      MAX(CASE WHEN rn = 1 THEN date END) AS latest_date,
      MAX(CASE WHEN rn = 2 THEN close END) AS prev_close
    FROM ranked_prices
    WHERE rn <= 2
    GROUP BY symbol
  `);

  const priceBySymbol = new Map<string, number>();
  const prevPriceBySymbol = new Map<string, number>();
  const priceChangeBySymbol = new Map<string, number>();

  // 결과 파싱
  for (const row of priceData.rows as Array<{
    symbol: string;
    latest_close: string | null;
    latest_date: string | null;
    prev_close: string | null;
  }>) {
    const symbol = row.symbol;
    if (row.latest_close) {
      priceBySymbol.set(symbol, parseFloat(row.latest_close));
    }
    if (row.prev_close) {
      prevPriceBySymbol.set(symbol, parseFloat(row.prev_close));
    }
  }

  // 전일대비 변동률 계산
  for (const symbol of uniqueSymbols) {
    const currentPrice = priceBySymbol.get(symbol);
    const prevPrice = prevPriceBySymbol.get(symbol);

    if (currentPrice && prevPrice && prevPrice > 0) {
      const changePercent = ((currentPrice - prevPrice) / prevPrice) * 100;
      priceChangeBySymbol.set(symbol, changePercent);
    }
  }

  // 결과 조합
  const result: TradeListItem[] = tradeList.map(({ trade, companyName }) => {
    const actions = actionsByTradeId.get(trade.id) || [];
    const currentPrice = priceBySymbol.get(trade.symbol) || null;
    const priceChangePercent = priceChangeBySymbol.get(trade.symbol) || null;

    const commissionRate = trade.commissionRate
      ? parseFloat(trade.commissionRate)
      : undefined;
    const calculated = calculateTradeMetrics(
      actions,
      trade.planStopLoss,
      commissionRate
    );

    const holdingDays =
      trade.status === "CLOSED"
        ? calculateHoldingDays(trade.startDate, trade.endDate)
        : undefined;

    return {
      ...trade,
      companyName,
      currentPrice,
      priceChangePercent,
      calculated: {
        avgEntryPrice: calculated.avgEntryPrice,
        currentQuantity: calculated.currentQuantity,
        realizedPnl: calculated.realizedPnl,
        realizedRoi: calculated.realizedRoi,
        totalBuyQuantity: calculated.totalBuyQuantity,
        totalSellQuantity: calculated.totalSellQuantity,
        avgExitPrice: calculated.avgExitPrice,
        totalCommission: calculated.totalCommission,
        holdingDays,
      },
    };
  });

  return result;
}

/**
 * 매매 상세 조회 (서버 컴포넌트용)
 */
export async function getTradeDetail(
  tradeId: number
): Promise<TradeWithDetails | null> {
  const userId = await getUserIdFromCookies();

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
    return null;
  }

  const actions = await db
    .select()
    .from(tradeActions)
    .where(eq(tradeActions.tradeId, tradeId))
    .orderBy(tradeActions.actionDate);

  const latestPrice = await db
    .select({ close: dailyPrices.close })
    .from(dailyPrices)
    .where(eq(dailyPrices.symbol, tradeResult.trade.symbol))
    .orderBy(desc(dailyPrices.date))
    .limit(1);

  const currentPrice = latestPrice[0]?.close
    ? parseFloat(latestPrice[0].close)
    : null;

  const commissionRate = tradeResult.trade.commissionRate
    ? parseFloat(tradeResult.trade.commissionRate)
    : undefined;
  const calculated = calculateTradeMetrics(
    actions,
    tradeResult.trade.planStopLoss,
    commissionRate
  );

  return {
    ...tradeResult.trade,
    actions,
    calculated,
    symbolInfo: {
      companyName: tradeResult.companyName,
      sector: tradeResult.sector,
      currentPrice,
    },
  };
}

/**
 * 현금 보유량 조회 (서버 컴포넌트용)
 */
export async function getCashBalance(): Promise<number> {
  const userId = await getUserIdFromCookies();
  const [settings] = await db
    .select({ cashBalance: portfolioSettings.cashBalance })
    .from(portfolioSettings)
    .where(eq(portfolioSettings.userId, userId))
    .limit(1);

  return settings?.cashBalance ? parseFloat(settings.cashBalance) : 0;
}

/**
 * 거래 개수 조회 (서버 컴포넌트용)
 */
export async function getTradesCount(): Promise<{
  open: number;
  closed: number;
}> {
  const userId = await getUserIdFromCookies();

  const [openResult] = await db
    .select({ count: count() })
    .from(trades)
    .where(and(eq(trades.userId, userId), eq(trades.status, "OPEN")));

  const [closedResult] = await db
    .select({ count: count() })
    .from(trades)
    .where(and(eq(trades.userId, userId), eq(trades.status, "CLOSED")));

  return {
    open: openResult?.count ?? 0,
    closed: closedResult?.count ?? 0,
  };
}
