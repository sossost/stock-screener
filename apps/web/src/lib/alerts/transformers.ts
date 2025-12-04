import type { ScreenerCompany } from "@/types/screener";
import { parseNumericValue } from "@/lib/screener/query-builder";

/**
 * QueryResult 인터페이스
 */
export interface QueryResult {
  symbol: string;
  trade_date: string;
  last_close: number;
  rs_score: number | null;
  market_cap: number | null;
  sector: string | null;
  quarterly_data: unknown;
  latest_eps: number | null;
  revenue_growth_quarters: number | null;
  income_growth_quarters: number | null;
  revenue_avg_growth_rate: number | null;
  income_avg_growth_rate: number | null;
  pe_ratio: number | string | null;
  peg_ratio: number | string | null;
  ma20: number | null;
  ma50: number | null;
  ma100: number | null;
  ma200: number | null;
  [key: string]: unknown;
}

/**
 * QueryResult 타입 가드
 */
export function isQueryResult(row: unknown): row is QueryResult {
  return (
    typeof row === "object" &&
    row !== null &&
    "symbol" in row &&
    "trade_date" in row &&
    "last_close" in row
  );
}

/**
 * 정배열 여부 계산
 * @param ma100 사용하지 않음, 호환성 유지
 */
export function calculateOrdered(
  ma20: number | null,
  ma50: number | null,
  ma100: number | null,
  ma200: number | null
): boolean {
  // 정배열: MA20 > MA50 > MA200 (100일선 제외)
  return (
    ma20 !== null &&
    ma50 !== null &&
    ma200 !== null &&
    ma20 > ma50 &&
    ma50 > ma200
  );
}

/**
 * 수익성 상태 계산
 */
export function calculateProfitabilityStatus(
  latestEps: number | null
): "profitable" | "unprofitable" | "unknown" {
  if (latestEps === null) return "unknown";
  return latestEps > 0 ? "profitable" : "unprofitable";
}

/**
 * quarterly_data를 안전하게 파싱
 */
function parseQuarterlyData(data: unknown): Array<{
  period_end_date: string;
  revenue: number | null;
  net_income: number | null;
  eps_diluted: number | null;
}> {
  if (!Array.isArray(data)) return [];
  return data;
}

/**
 * QueryResult를 ScreenerCompany로 변환
 */
export function transformToScreenerCompany(r: QueryResult): ScreenerCompany {
  return {
    symbol: r.symbol,
    market_cap: r.market_cap?.toString() || null,
    sector: r.sector ?? null,
    last_close: r.last_close?.toString() || "0",
    quarterly_financials: parseQuarterlyData(r.quarterly_data),
    profitability_status: calculateProfitabilityStatus(r.latest_eps),
    revenue_growth_quarters: r.revenue_growth_quarters || 0,
    income_growth_quarters: r.income_growth_quarters || 0,
    revenue_avg_growth_rate: r.revenue_avg_growth_rate,
    income_avg_growth_rate: r.income_avg_growth_rate,
    ordered: calculateOrdered(r.ma20, r.ma50, r.ma100, r.ma200),
    just_turned: false,
    rs_score:
      r.rs_score === null || r.rs_score === undefined
        ? null
        : Number(r.rs_score),
    pe_ratio: parseNumericValue(r.pe_ratio),
    peg_ratio: parseNumericValue(r.peg_ratio),
  };
}
