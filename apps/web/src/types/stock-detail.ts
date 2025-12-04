// 종목 상세 페이지 타입 정의

export interface StockBasicInfo {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  exchangeShortName: string | null;
  country: string | null;
  marketCap: string | null;
  beta: string | null;
  isEtf: boolean;
  isFund: boolean;
  isActivelyTrading: boolean;
}

export interface StockPriceInfo {
  lastClose: string | null;
  rsScore: number | null;
  volume: string | null;
  date: string | null;
}

export interface StockMAInfo {
  ma20: string | null;
  ma50: string | null;
  ma100: string | null;
  ma200: string | null;
  volMa30: string | null;
}

export interface StockMAStatus {
  /** MA20 > MA50 > MA200 정배열 (100일선 제외) */
  ordered: boolean;
  /** MA50 > MA200 골든크로스 */
  goldenCross: boolean;
}

export interface StockValuation {
  peRatio: string | null;
  pegRatio: string | null;
  fwdPegRatio: string | null;
  psRatio: string | null;
  pbRatio: string | null;
  evEbitda: string | null;
}

export interface StockProfitability {
  grossMargin: string | null;
  opMargin: string | null;
  netMargin: string | null;
}

export interface StockLeverage {
  debtEquity: string | null;
  debtAssets: string | null;
  intCoverage: string | null;
}

export interface StockDividend {
  divYield: string | null;
  payoutRatio: string | null;
}

export interface StockRatios {
  valuation: StockValuation;
  /** 밸류에이션 기준일 (가격 날짜, 데일리 업데이트) */
  valuationDate: string | null;
  profitability: StockProfitability;
  leverage: StockLeverage;
  dividend: StockDividend;
  /** 분기 재무 기준일 (분기 말일, 분기별 업데이트) */
  quarterlyPeriodEndDate: string | null;
}

/** 분기별 재무 데이터 (차트용) */
export interface QuarterlyFinancial {
  quarter: string; // "Q3 2024"
  date: string; // "2024-09-30"
  revenue: number | null;
  netIncome: number | null;
  eps: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
}

export interface StockDetail {
  basic: StockBasicInfo;
  price: StockPriceInfo;
  ma: StockMAInfo;
  maStatus: StockMAStatus;
  ratios: StockRatios | null;
  /** 최근 8분기 재무 데이터 (차트용) */
  quarterlyFinancials: QuarterlyFinancial[];
}

export interface StockDetailResponse {
  data: StockDetail | null;
  error?: string;
}
