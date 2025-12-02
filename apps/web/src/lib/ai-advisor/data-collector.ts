/**
 * AI Advisor 데이터 수집 유틸리티
 * 종목 상세 페이지에서 필요한 데이터를 수집하여 AI Advisor 요청 형식으로 변환
 */

import { db } from "@/db/client";
import { trades, tradeActions, dailyPrices, dailyMa } from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { getUserIdFromCookies } from "@/lib/auth/user";
import {
  calculateRSIWithTime,
  calculateMACDWithTime,
  calculateATR,
  calculateSMA,
  type OHLCData,
} from "@/lib/technical-indicators";
import {
  calculateTradeMetrics,
  calculateHoldingDays,
} from "@/lib/trades/calculations";
import type {
  AIAdvisorRequest,
  MarketContext,
  TechnicalIndicators,
  UserPosition,
} from "@/types/ai-advisor";

/**
 * 종목의 최근 가격 데이터 조회 (기술적 지표 계산용)
 */
const DEFAULT_PRICE_DATA_DAYS = 200;

async function getPriceDataForIndicators(
  symbol: string,
  days: number = DEFAULT_PRICE_DATA_DAYS
): Promise<OHLCData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().slice(0, 10);

  const priceData = await db
    .select({
      date: dailyPrices.date,
      open: dailyPrices.open,
      high: dailyPrices.high,
      low: dailyPrices.low,
      close: dailyPrices.close,
    })
    .from(dailyPrices)
    .where(
      and(
        eq(dailyPrices.symbol, symbol.toUpperCase()),
        gte(dailyPrices.date, startDateStr)
      )
    )
    .orderBy(dailyPrices.date)
    .limit(days);

  return priceData.map((d) => ({
    time: d.date,
    open: parseFloat(d.open || "0"),
    high: parseFloat(d.high || "0"),
    low: parseFloat(d.low || "0"),
    close: parseFloat(d.close || "0"),
  }));
}

/**
 * 사용자 포지션 정보 조회
 */
async function getUserPosition(symbol: string): Promise<UserPosition | null> {
  const userId = await getUserIdFromCookies();

  // OPEN 상태의 매매 조회
  const [openTrade] = await db
    .select()
    .from(trades)
    .where(
      and(
        eq(trades.userId, userId),
        eq(trades.symbol, symbol.toUpperCase()),
        eq(trades.status, "OPEN")
      )
    )
    .limit(1);

  if (!openTrade) {
    return {
      hasPosition: false,
      status: "NONE",
    };
  }

  // 액션 조회
  const actions = await db
    .select()
    .from(tradeActions)
    .where(eq(tradeActions.tradeId, openTrade.id))
    .orderBy(tradeActions.actionDate);

  // 현재가 조회
  const [latestPrice] = await db
    .select({ close: dailyPrices.close })
    .from(dailyPrices)
    .where(eq(dailyPrices.symbol, symbol.toUpperCase()))
    .orderBy(desc(dailyPrices.date))
    .limit(1);

  const currentPrice = latestPrice?.close
    ? parseFloat(latestPrice.close)
    : null;

  if (!currentPrice) {
    return {
      hasPosition: true,
      status: "HOLDING",
    };
  }

  // 손익 계산
  const commissionRate = openTrade.commissionRate
    ? parseFloat(openTrade.commissionRate)
    : undefined;
  const calculated = calculateTradeMetrics(
    actions,
    openTrade.planStopLoss,
    commissionRate
  );

  const entryPrice = calculated.avgEntryPrice;
  if (!entryPrice) {
    return {
      hasPosition: true,
      status: "HOLDING",
    };
  }

  const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

  // RUNNER 상태 판단: 1차 익절 후 남은 물량이 있는지 확인
  // 실제로는 더 복잡한 로직이 필요하지만, 간단히 현재 수량이 초기 수량보다 적으면 RUNNER로 판단
  const isRunner =
    calculated.currentQuantity > 0 &&
    calculated.totalBuyQuantity > calculated.currentQuantity;

  return {
    hasPosition: true,
    entryPrice,
    currentPnlPercent: pnlPercent,
    status: isRunner ? "RUNNER" : "HOLDING",
  };
}

/**
 * 금요일 여부 확인
 */
function isFriday(): boolean {
  const today = new Date();
  return today.getDay() === 5; // 0 = 일요일, 5 = 금요일
}

/**
 * 시장 상태 판단 (간단한 구현)
 */
function getMarketStatus(): "OPEN" | "CLOSED" | "PRE_MARKET" {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  // 주말
  if (day === 0 || day === 6) {
    return "CLOSED";
  }

  // 장 시작 전 (9:30 ET = 14:30 KST, 간단히 15시로 가정)
  if (hour < 15) {
    return "PRE_MARKET";
  }

  // 장 마감 후 (16:00 ET = 21:00 KST)
  if (hour >= 21) {
    return "CLOSED";
  }

  return "OPEN";
}

/**
 * AI Advisor 요청 데이터 수집
 */
export async function collectAdvisorData(
  symbol: string,
  currentPrice: number
): Promise<
  { data: AIAdvisorRequest; error: null } | { data: null; error: string }
> {
  try {
    // 1. 가격 데이터 조회 (기술적 지표 계산용)
    const PRICE_DATA_LOOKBACK_DAYS = 200;
    const MIN_PRICE_DATA_DAYS = 30; // RSI 14일 + MACD 26일 + 여유분

    const priceData = await getPriceDataForIndicators(
      symbol,
      PRICE_DATA_LOOKBACK_DAYS
    );

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Data Collector] Price data count: ${priceData.length} for ${symbol}`
      );
    }

    if (priceData.length < MIN_PRICE_DATA_DAYS) {
      const error = `가격 데이터가 부족합니다 (${priceData.length}일, 최소 30일 필요)`;
      console.error(`[Data Collector] ${error} for ${symbol}`);
      return { data: null, error };
    }

    // 2. 기술적 지표 계산
    const closes = priceData.map((d) => d.close);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);

    const ohlcData: OHLCData[] = priceData.map((d) => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const rsiData = calculateRSIWithTime(ohlcData, 14);
    const macdData = calculateMACDWithTime(ohlcData, 12, 26, 9);
    const atr = calculateATR(ohlcData, 14);

    // 최신 값 가져오기
    const latestRsi = rsiData[rsiData.length - 1];
    const latestMacd = macdData[macdData.length - 1];
    const latestSma20 = sma20[sma20.length - 1];
    const latestSma50 = sma50[sma50.length - 1];
    const latestSma200 = sma200[sma200.length - 1];

    if (process.env.NODE_ENV === "development") {
      console.log(`[Data Collector] Indicators:`, {
        rsi: latestRsi?.value,
        macd: latestMacd
          ? { histogram: latestMacd.histogram, signal: latestMacd.signal }
          : null,
        sma20: latestSma20,
        sma50: latestSma50,
        sma200: latestSma200,
        atr,
      });
    }

    // 필수 지표 검증 (일부는 선택적으로 처리)
    if (!latestRsi || latestRsi.value === undefined || isNaN(latestRsi.value)) {
      const error = "RSI 지표를 계산할 수 없습니다";
      console.error(`[Data Collector] ${error}:`, latestRsi);
      return { data: null, error };
    }
    if (
      !latestMacd ||
      latestMacd.histogram === undefined ||
      latestMacd.signal === undefined
    ) {
      const error = "MACD 지표를 계산할 수 없습니다";
      console.error(`[Data Collector] ${error}:`, latestMacd);
      return { data: null, error };
    }
    if (!atr || isNaN(atr) || atr <= 0) {
      const error = "ATR 지표를 계산할 수 없습니다";
      console.error(`[Data Collector] ${error}:`, atr);
      return { data: null, error };
    }

    // SMA는 일부가 없어도 계산된 값으로 대체 가능하지만, 최소한 하나는 필요
    const finalSma20 = isNaN(latestSma20) ? null : latestSma20;
    const finalSma50 = isNaN(latestSma50) ? null : latestSma50;
    const finalSma200 = isNaN(latestSma200) ? null : latestSma200;

    // MA20은 필수, MA50과 MA200은 선택적 (없으면 계산된 값 사용)
    if (!finalSma20) {
      const error = "이동평균선(MA20)을 계산할 수 없습니다";
      console.error(`[Data Collector] ${error}`);
      return { data: null, error };
    }

    // MA50이나 MA200이 없으면 계산된 값으로 대체
    const useSma50 =
      finalSma50 ??
      (priceData.length >= 50
        ? calculateSMA(closes, 50)[closes.length - 1]
        : finalSma20);
    const useSma200 =
      finalSma200 ??
      (priceData.length >= 200
        ? calculateSMA(closes, 200)[closes.length - 1]
        : useSma50);

    if (isNaN(useSma50) || isNaN(useSma200)) {
      const error = `이동평균선 계산 실패 (MA50: ${useSma50}, MA200: ${useSma200})`;
      console.error(`[Data Collector] ${error}`, {
        sma50: useSma50,
        sma200: useSma200,
        priceDataLength: priceData.length,
      });
      return { data: null, error };
    }

    // 3. 이동평균선 조회 (DB에서 최신 값)
    const [maData] = await db
      .select()
      .from(dailyMa)
      .where(eq(dailyMa.symbol, symbol.toUpperCase()))
      .orderBy(desc(dailyMa.date))
      .limit(1);

    const technicalIndicators: TechnicalIndicators = {
      ma20: maData?.ma20 ? parseFloat(maData.ma20) : finalSma20,
      ma50: maData?.ma50 ? parseFloat(maData.ma50) : useSma50,
      ma200: maData?.ma200 ? parseFloat(maData.ma200) : useSma200,
      rsi14: latestRsi.value,
      atr14: atr,
      macd: {
        histogram: latestMacd.histogram,
        signal: latestMacd.signal,
      },
    };

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Data Collector] Successfully collected data for ${symbol}:`,
        {
          ma20: technicalIndicators.ma20,
          ma50: technicalIndicators.ma50,
          ma200: technicalIndicators.ma200,
          rsi14: technicalIndicators.rsi14,
          atr14: technicalIndicators.atr14,
        }
      );
    }

    // 4. 시장 컨텍스트
    const marketContext: MarketContext = {
      ticker: symbol.toUpperCase(),
      currentPrice,
      marketStatus: getMarketStatus(),
      isFriday: isFriday(),
    };

    // 5. 사용자 포지션 정보
    const userPosition = await getUserPosition(symbol);

    return {
      data: {
        marketContext,
        technicalIndicators,
        userPosition: userPosition || undefined,
      },
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다";
    console.error("[Data Collector] Error:", error);
    return { data: null, error: errorMessage };
  }
}
