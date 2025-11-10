// Golden Cross API 타입 정의

export interface QuarterlyFinancial {
  period_end_date: string;
  revenue: number | null;
  net_income: number | null;
  eps_diluted: number | null;
}

export interface GoldenCrossCompany {
  symbol: string;
  market_cap: string | null;
  last_close: string;
  quarterly_financials: QuarterlyFinancial[];
  profitability_status: "profitable" | "unprofitable" | "unknown";
  revenue_growth_status: "growing" | "not_growing" | "unknown";
  income_growth_status: "growing" | "not_growing" | "unknown";
  revenue_growth_quarters: number;
  income_growth_quarters: number;
  revenue_avg_growth_rate: number | null;
  income_avg_growth_rate: number | null;
  ordered: boolean;
  just_turned: boolean;
  pe_ratio: number | null;
  peg_ratio: number | null;
}

// 스크리너 컴포넌트용 타입 (revenue_growth_status, income_growth_status 제외)
export interface ScreenerCompany {
  symbol: string;
  market_cap: string | null;
  last_close: string;
  quarterly_financials: QuarterlyFinancial[];
  profitability_status: "profitable" | "unprofitable" | "unknown";
  revenue_growth_quarters: number;
  income_growth_quarters: number;
  revenue_avg_growth_rate: number | null;
  income_avg_growth_rate: number | null;
  ordered: boolean;
  just_turned: boolean;
  pe_ratio: number | null;
  peg_ratio: number | null;
}

// 스크리너 클라이언트 Props 타입
export interface ScreenerClientProps {
  data: ScreenerCompany[];
  tradeDate: string | null;
}

export interface GoldenCrossResponse {
  data: GoldenCrossCompany[];
  trade_date: string;
}

// API 파라미터 타입
export interface GoldenCrossParams {
  ordered?: boolean; // MA20 > MA50 > MA100 > MA200 정배열 조건 적용 여부
  goldenCross?: boolean; // MA50 > MA200 조건 적용 여부
  justTurned?: boolean;
  lookbackDays?: number;
  minMcap?: number;
  minPrice?: number;
  minAvgVol?: number;
  allowOTC?: boolean;
  profitability?: "all" | "profitable" | "unprofitable";
  revenueGrowth?: boolean;
  incomeGrowth?: boolean;
}

// 이평선 필터 상태 타입
export interface MAFilterState {
  ordered: boolean; // MA20 > MA50 > MA100 > MA200 정배열
  goldenCross: boolean; // MA50 > MA200
}

// 성장성 상태 타입
export type GrowthStatus = "growing" | "not_growing" | "unknown";

// 수익성 상태 타입
export type ProfitabilityStatus = "profitable" | "unprofitable" | "unknown";
