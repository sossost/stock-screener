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

// 캐싱 설정: 24시간 (종가 기준 데이터, 하루 1회 갱신)
export const revalidate = 86400;

/**
 * 요청 파라미터 파싱
 */
function parseRequestParams(searchParams: URLSearchParams): ScreenerParams {
  // 성장률 파싱 (null 허용)
  const parseGrowthRate = (param: string | null): number | null => {
    if (!param) return null;
    const parsed = Number(param);
    return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
  };

  return {
    // 이동평균선 필터
    ordered: searchParams.get("ordered") !== "false",
    goldenCross: searchParams.get("goldenCross") !== "false",
    justTurned: searchParams.get("justTurned") === "true",
    lookbackDays: Number(searchParams.get("lookbackDays") ?? 10),

    // 기본 필터
    minMcap: Number(searchParams.get("minMcap") ?? 0),
    minPrice: Number(searchParams.get("minPrice") ?? 0),
    minAvgVol: Number(searchParams.get("minAvgVol") ?? 0),
    allowOTC: searchParams.get("allowOTC") !== "false",

    // 수익성/성장성 필터
    profitability:
      (searchParams.get("profitability") as
        | "all"
        | "profitable"
        | "unprofitable") ?? "all",
    turnAround: searchParams.get("turnAround") === "true",
    revenueGrowth: searchParams.get("revenueGrowth") === "true",
    incomeGrowth: searchParams.get("incomeGrowth") === "true",
    revenueGrowthQuarters: Number(
      searchParams.get("revenueGrowthQuarters") ?? 3
    ),
    incomeGrowthQuarters: Number(searchParams.get("incomeGrowthQuarters") ?? 3),
    revenueGrowthRate: parseGrowthRate(searchParams.get("revenueGrowthRate")),
    incomeGrowthRate: parseGrowthRate(searchParams.get("incomeGrowthRate")),

    // 밸류에이션 필터
    pegFilter: searchParams.get("pegFilter") === "true",
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
    ordered: true,
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
