import { db } from "@/db/client";
import { symbols, dailyPrices, dailyMa } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { StockDetail } from "@/types/stock-detail";

/**
 * 종목 상세 정보 조회
 * @param symbol 종목 티커 (대소문자 무관)
 * @returns StockDetail 또는 null (존재하지 않는 경우)
 */
export async function getStockDetail(
  symbol: string
): Promise<StockDetail | null> {
  const upperSymbol = symbol.toUpperCase();

  // 1. 기본 정보 조회
  const [symbolData] = await db
    .select()
    .from(symbols)
    .where(eq(symbols.symbol, upperSymbol))
    .limit(1);

  if (!symbolData) {
    return null;
  }

  // 2. 최신 가격 정보 조회
  const [priceData] = await db
    .select()
    .from(dailyPrices)
    .where(eq(dailyPrices.symbol, upperSymbol))
    .orderBy(desc(dailyPrices.date))
    .limit(1);

  // 3. 최신 이동평균선 정보 조회
  const [maData] = await db
    .select()
    .from(dailyMa)
    .where(eq(dailyMa.symbol, upperSymbol))
    .orderBy(desc(dailyMa.date))
    .limit(1);

  // 4. 이평선 상태 계산
  const ma20 = maData?.ma20 ? parseFloat(maData.ma20) : null;
  const ma50 = maData?.ma50 ? parseFloat(maData.ma50) : null;
  const ma100 = maData?.ma100 ? parseFloat(maData.ma100) : null;
  const ma200 = maData?.ma200 ? parseFloat(maData.ma200) : null;

  const ordered =
    ma20 !== null &&
    ma50 !== null &&
    ma100 !== null &&
    ma200 !== null &&
    ma20 > ma50 &&
    ma50 > ma100 &&
    ma100 > ma200;

  const goldenCross = ma50 !== null && ma200 !== null && ma50 > ma200;

  return {
    basic: {
      symbol: symbolData.symbol,
      companyName: symbolData.companyName,
      sector: symbolData.sector,
      industry: symbolData.industry,
      exchange: symbolData.exchange,
      exchangeShortName: symbolData.exchangeShortName,
      country: symbolData.country,
      marketCap: symbolData.marketCap,
      beta: symbolData.beta,
      isEtf: symbolData.isEtf ?? false,
      isFund: symbolData.isFund ?? false,
      isActivelyTrading: symbolData.isActivelyTrading ?? true,
    },
    price: {
      lastClose: priceData?.close ?? null,
      rsScore: priceData?.rsScore ?? null,
      volume: priceData?.volume ?? null,
      date: priceData?.date ?? null,
    },
    ma: {
      ma20: maData?.ma20 ?? null,
      ma50: maData?.ma50 ?? null,
      ma100: maData?.ma100 ?? null,
      ma200: maData?.ma200 ?? null,
      volMa30: maData?.volMa30 ?? null,
    },
    maStatus: {
      ordered,
      goldenCross,
    },
  };
}

