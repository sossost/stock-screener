import { db } from "@/db/client";
import {
  trades,
  tradeActions,
  symbols,
  dailyPrices,
  portfolioSettings,
} from "@/db/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
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

  // 배치 조회: 심볼별 최신 가격 및 전일 가격
  const uniqueSymbols = [...new Set(tradeList.map((t) => t.trade.symbol))];

  // 최신 가격 조회
  const latestPrices = await db
    .select({
      symbol: dailyPrices.symbol,
      close: dailyPrices.close,
      date: dailyPrices.date,
    })
    .from(dailyPrices)
    .where(
      and(
        inArray(dailyPrices.symbol, uniqueSymbols),
        sql`(${dailyPrices.symbol}, ${dailyPrices.date}) IN (
          SELECT symbol, MAX(date) FROM daily_prices 
          WHERE symbol IN (${sql.join(
            uniqueSymbols.map((s) => sql`${s}`),
            sql`, `
          )})
          GROUP BY symbol
        )`
      )
    );

  // 전일 가격 조회 (최신 날짜보다 하루 전)
  const latestDatesBySymbol = new Map<string, string>();
  for (const price of latestPrices) {
    if (price.date) {
      latestDatesBySymbol.set(price.symbol, price.date);
    }
  }

  const prevPrices = await db
    .select({
      symbol: dailyPrices.symbol,
      close: dailyPrices.close,
    })
    .from(dailyPrices)
    .where(
      and(
        inArray(dailyPrices.symbol, uniqueSymbols),
        sql`(${dailyPrices.symbol}, ${dailyPrices.date}) IN (
          SELECT symbol, MAX(date) FROM daily_prices 
          WHERE symbol IN (${sql.join(
            uniqueSymbols.map((s) => sql`${s}`),
            sql`, `
          )})
            AND date < (
              SELECT MAX(date) FROM daily_prices 
              WHERE symbol = daily_prices.symbol
            )
          GROUP BY symbol
        )`
      )
    );

  const priceBySymbol = new Map<string, number>();
  const prevPriceBySymbol = new Map<string, number>();
  const priceChangeBySymbol = new Map<string, number>();

  for (const price of latestPrices) {
    if (price.close) {
      priceBySymbol.set(price.symbol, parseFloat(price.close));
    }
  }

  for (const price of prevPrices) {
    if (price.close) {
      prevPriceBySymbol.set(price.symbol, parseFloat(price.close));
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
