// Screener API 타입 정의

export interface QuarterlyFinancial {
  period_end_date: string;
  revenue: number | null;
  net_income: number | null;
  eps_diluted: number | null;
}

export interface ScreenerCompany {
  symbol: string;
  market_cap: string | null;
  sector: string | null;
  last_close: string;
  rs_score: number | null;
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
  turned_profitable?: boolean | null;
}

// 스크리너 클라이언트 Props 타입
export interface ScreenerClientProps {
  data: ScreenerCompany[];
  tradeDate: string | null;
  error?: string | null;
}

export interface ScreenerResponse {
  data: ScreenerCompany[];
  trade_date: string;
}

// API 파라미터 타입
export interface ScreenerParams {
  ordered?: boolean; // MA20 > MA50 > MA200 정배열 조건 적용 여부 (100일선 제외)
  goldenCross?: boolean; // MA50 > MA200 조건 적용 여부
  justTurned?: boolean;
  lookbackDays?: number;
  minMcap?: number;
  minPrice?: number;
  minAvgVol?: number;
  allowOTC?: boolean;
  profitability?: "all" | "profitable" | "unprofitable";
  turnAround?: boolean;
  revenueGrowth?: boolean;
  incomeGrowth?: boolean;
  revenueGrowthQuarters?: number;
  incomeGrowthQuarters?: number;
  revenueGrowthRate?: number | null;
  incomeGrowthRate?: number | null;
  pegFilter?: boolean;
  ma20Above?: boolean; // 20일선 위
  ma50Above?: boolean; // 50일선 위
  ma100Above?: boolean; // 100일선 위
  ma200Above?: boolean; // 200일선 위
  breakoutStrategy?: "confirmed" | "retest" | null; // 돌파매매 전략 (전략 A: confirmed, 전략 B: retest)
  volumeFilter?: boolean; // 거래량 필터 (20일 평균 거래대금 > $10M OR 평균 거래량 > 500K)
  vcpFilter?: boolean; // 변동성 압축 필터 (VCP)
  bodyFilter?: boolean; // 캔들 몸통 필터 (몸통 > 전체 길이의 60%)
  maConvergenceFilter?: boolean; // 이평선 밀집 필터 (MA20-MA50 간격 < 3%)
}

// DB 쿼리 결과 타입
export interface ScreenerQueryResult {
  symbol: string;
  trade_date: string;
  last_close: number;
  rs_score: number | null;
  market_cap: number | null;
  quarterly_data: QuarterlyFinancial[] | null;
  latest_eps: number | null;
  prev_eps: number | null;
  turned_profitable: boolean | null;
  revenue_growth_quarters: number | null;
  income_growth_quarters: number | null;
  revenue_avg_growth_rate: number | null;
  income_avg_growth_rate: number | null;
  pe_ratio: number | string | null;
  peg_ratio: number | string | null;
  sector: string | null;
  ordered: boolean | null; // 정배열 여부 (MA 데이터가 없으면 null)
}

// 이평선 필터 상태 타입
export interface MAFilterState {
  ordered: boolean; // MA20 > MA50 > MA200 정배열 (100일선 제외)
  goldenCross: boolean; // MA50 > MA200
}

// 성장성 상태 타입
export type GrowthStatus = "growing" | "not_growing" | "unknown";

// 수익성 상태 타입
export type ProfitabilityStatus = "profitable" | "unprofitable" | "unknown";
