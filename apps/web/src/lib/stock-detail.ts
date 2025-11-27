import { db } from "@/db/client";
import {
  symbols,
  dailyPrices,
  dailyMa,
  dailyRatios,
  quarterlyRatios,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import type { StockDetail, StockRatios } from "@/types/stock-detail";

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

  // 4. 일일 밸류에이션 지표 조회 (가격 날짜와 일치하는 데이터만 사용)
  // 날짜 불일치 시 quarterly_ratios로 폴백 (golden-cross API와 동일 로직)
  const priceDate = priceData?.date;
  let dailyRatiosData = null;

  if (priceDate) {
    const [matchingData] = await db
      .select()
      .from(dailyRatios)
      .where(
        and(
          eq(dailyRatios.symbol, upperSymbol),
          eq(dailyRatios.date, priceDate)
        )
      )
      .limit(1);
    dailyRatiosData = matchingData ?? null;
  }

  // 5. 분기 재무비율 조회 (수익성, 레버리지, 배당 등)
  const [quarterlyRatiosData] = await db
    .select()
    .from(quarterlyRatios)
    .where(eq(quarterlyRatios.symbol, upperSymbol))
    .orderBy(desc(quarterlyRatios.periodEndDate))
    .limit(1);

  // 6. 이평선 상태 계산
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

  // 7. ratios 매핑 (daily_ratios 우선, quarterly_ratios 폴백)
  const hasValuationData = dailyRatiosData || quarterlyRatiosData;
  const ratios: StockRatios | null = hasValuationData
    ? {
        valuation: {
          // 밸류에이션: daily_ratios 우선 (TTM 기준 매일 업데이트)
          peRatio:
            dailyRatiosData?.peRatio ?? quarterlyRatiosData?.peRatio ?? null,
          pegRatio:
            dailyRatiosData?.pegRatio ?? quarterlyRatiosData?.pegRatio ?? null,
          fwdPegRatio: quarterlyRatiosData?.fwdPegRatio ?? null,
          psRatio:
            dailyRatiosData?.psRatio ?? quarterlyRatiosData?.psRatio ?? null,
          pbRatio:
            dailyRatiosData?.pbRatio ?? quarterlyRatiosData?.pbRatio ?? null,
          evEbitda:
            dailyRatiosData?.evEbitda ?? quarterlyRatiosData?.evEbitda ?? null,
        },
        // 밸류에이션 기준일: 가격 날짜 (데일리 업데이트)
        valuationDate: priceDate ?? dailyRatiosData?.date ?? null,
        profitability: {
          // 수익성: quarterly_ratios에서만 (분기별 데이터)
          grossMargin: quarterlyRatiosData?.grossMargin ?? null,
          opMargin: quarterlyRatiosData?.opMargin ?? null,
          netMargin: quarterlyRatiosData?.netMargin ?? null,
        },
        leverage: {
          // 레버리지: quarterly_ratios에서만
          debtEquity: quarterlyRatiosData?.debtEquity ?? null,
          debtAssets: quarterlyRatiosData?.debtAssets ?? null,
          intCoverage: quarterlyRatiosData?.intCoverage ?? null,
        },
        dividend: {
          // 배당: quarterly_ratios에서만
          divYield: quarterlyRatiosData?.divYield ?? null,
          payoutRatio: quarterlyRatiosData?.payoutRatio ?? null,
        },
        // 분기 재무 기준일: 분기 말일 (분기별 업데이트)
        quarterlyPeriodEndDate: quarterlyRatiosData?.periodEndDate ?? null,
      }
    : null;

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
    ratios,
  };
}
