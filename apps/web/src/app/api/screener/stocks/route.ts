// app/api/screener/stocks/route.ts
// 통합 스크리너 API - 기존 golden-cross API 리팩토링
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { handleApiError, logError } from "@/lib/errors";
import {
  buildScreenerQuery,
  validateParams,
  parseNumericValue,
} from "@/lib/screener/query-builder";
import type {
  ScreenerParams,
  ScreenerQueryResult,
  ScreenerCompany,
} from "@/types/screener";
import { URL_PARAM_VALUES, FILTER_DEFAULTS } from "@/lib/filters/constants";

// 캐싱 설정: 24시간 (종가 기준 데이터, 하루 1회 갱신)
export const revalidate = 86400;

/**
 * Boolean 파라미터 파싱 헬퍼
 */
function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === URL_PARAM_VALUES.TRUE) return true;
  if (value === URL_PARAM_VALUES.FALSE) return false;
  return undefined;
}

/**
 * 정수 파라미터 파싱 헬퍼 (NaN 체크 포함)
 */
function parseIntegerParam(
  value: string | null,
  defaultValue?: number
): number | undefined {
  if (value === null) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 부동소수점 파라미터 파싱 헬퍼 (null 허용)
 */
function parseGrowthRate(param: string | null): number | null {
  if (!param) return null;
  const parsed = Number(param);
  return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
}

/**
 * 요청 파라미터 파싱
 */
function parseRequestParams(searchParams: URLSearchParams): ScreenerParams {
  return {
    // 이동평균선 필터
    ordered: parseBooleanParam(searchParams.get("ordered")),
    // goldenCross는 기본값 true (성능 최적화: 초기 로드 시 데이터 양 감소)
    goldenCross: parseBooleanParam(searchParams.get("goldenCross")) ?? true,
    justTurned: parseBooleanParam(searchParams.get("justTurned")),
    lookbackDays: parseIntegerParam(searchParams.get("lookbackDays")),

    // 기본 필터
    minMcap: parseIntegerParam(searchParams.get("minMcap"), 0) ?? 0,
    minPrice: parseIntegerParam(searchParams.get("minPrice"), 0) ?? 0,
    minAvgVol: parseIntegerParam(searchParams.get("minAvgVol"), 0) ?? 0,
    allowOTC: searchParams.get("allowOTC") !== URL_PARAM_VALUES.FALSE,

    // 수익성/성장성 필터
    profitability:
      (searchParams.get("profitability") as
        | "all"
        | "profitable"
        | "unprofitable") ?? "all",
    turnAround: parseBooleanParam(searchParams.get("turnAround")),
    revenueGrowth: parseBooleanParam(searchParams.get("revenueGrowth")),
    incomeGrowth: parseBooleanParam(searchParams.get("incomeGrowth")),
    revenueGrowthQuarters:
      parseIntegerParam(
        searchParams.get("revenueGrowthQuarters"),
        FILTER_DEFAULTS.REVENUE_GROWTH_QUARTERS
      ) ?? FILTER_DEFAULTS.REVENUE_GROWTH_QUARTERS,
    incomeGrowthQuarters:
      parseIntegerParam(
        searchParams.get("incomeGrowthQuarters"),
        FILTER_DEFAULTS.INCOME_GROWTH_QUARTERS
      ) ?? FILTER_DEFAULTS.INCOME_GROWTH_QUARTERS,
    revenueGrowthRate: parseGrowthRate(searchParams.get("revenueGrowthRate")),
    incomeGrowthRate: parseGrowthRate(searchParams.get("incomeGrowthRate")),

    // 밸류에이션 필터
    pegFilter: parseBooleanParam(searchParams.get("pegFilter")),

    // 이평선 위 필터
    ma20Above: parseBooleanParam(searchParams.get("ma20Above")),
    ma50Above: parseBooleanParam(searchParams.get("ma50Above")),
    ma100Above: parseBooleanParam(searchParams.get("ma100Above")),
    ma200Above: parseBooleanParam(searchParams.get("ma200Above")),
  };
}

/**
 * 쿼리 결과를 API 응답 형식으로 변환
 */
function transformResults(
  results: ScreenerQueryResult[],
  justTurned: boolean
): ScreenerCompany[] {
  return results.map((r) => ({
    symbol: r.symbol,
    market_cap: r.market_cap?.toString() || null,
    sector: r.sector ?? null,
    last_close: r.last_close.toString(),
    rs_score:
      r.rs_score === null || r.rs_score === undefined
        ? null
        : Number(r.rs_score),
    quarterly_financials: r.quarterly_data || [],
    profitability_status:
      r.latest_eps !== null && r.latest_eps > 0
        ? "profitable"
        : r.latest_eps !== null && r.latest_eps < 0
          ? "unprofitable"
          : "unknown",
    turned_profitable:
      r.turned_profitable === null || r.turned_profitable === undefined
        ? null
        : Boolean(r.turned_profitable),
    revenue_growth_quarters: r.revenue_growth_quarters || 0,
    income_growth_quarters: r.income_growth_quarters || 0,
    revenue_avg_growth_rate: r.revenue_avg_growth_rate,
    income_avg_growth_rate: r.income_avg_growth_rate,
    ordered: r.ordered ?? false, // 쿼리에서 계산된 정배열 여부 (null이면 false)
    just_turned: justTurned,
    pe_ratio: parseNumericValue(r.pe_ratio),
    peg_ratio: parseNumericValue(r.peg_ratio),
  }));
}

export async function GET(req: Request) {
  try {
    // 환경변수 체크
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    if (!process.env.FMP_API_KEY) {
      throw new Error("FMP_API_KEY environment variable is not set");
    }

    const { searchParams } = new URL(req.url);
    const params = parseRequestParams(searchParams);

    // 유효성 검사
    const validation = validateParams(params);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 성장률 파라미터 추가 유효성 검사
    if (
      params.revenueGrowthRate === null &&
      searchParams.get("revenueGrowthRate")
    ) {
      return NextResponse.json(
        { error: "revenueGrowthRate must be a valid number" },
        { status: 400 }
      );
    }
    if (
      params.incomeGrowthRate === null &&
      searchParams.get("incomeGrowthRate")
    ) {
      return NextResponse.json(
        { error: "incomeGrowthRate must be a valid number" },
        { status: 400 }
      );
    }

    // 쿼리 실행
    const query = buildScreenerQuery(params);
    const rows = await db.execute(query);
    // Drizzle의 결과 타입이 Record<string, unknown>[]이므로
    // ScreenerQueryResult[]로 변환 (쿼리 구조가 타입과 일치함)
    const results = rows.rows as unknown as ScreenerQueryResult[];
    const tradeDate = results.length > 0 ? results[0].trade_date : null;

    // 결과 변환
    const data = transformResults(results, params.justTurned ?? false);

    return NextResponse.json({
      count: data.length,
      trade_date: tradeDate,
      lookback_days: params.justTurned ? params.lookbackDays : null,
      data,
    });
  } catch (error) {
    logError(error, "Screener Stocks API");
    const apiError = handleApiError(error);

    return NextResponse.json(
      {
        error: apiError.message,
        details: apiError.details,
      },
      { status: apiError.statusCode }
    );
  }
}
