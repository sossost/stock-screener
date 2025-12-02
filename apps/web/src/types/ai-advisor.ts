/**
 * AI Trading Advisor 타입 정의
 */

export type MarketStatus = "OPEN" | "CLOSED" | "PRE_MARKET";

export type PositionStatus = "NONE" | "HOLDING" | "RUNNER";

export interface MarketContext {
  ticker: string;
  currentPrice: number;
  marketStatus: MarketStatus;
  isFriday: boolean;
}

export interface TechnicalIndicators {
  ma20: number;
  ma50: number;
  ma200: number;
  rsi14: number;
  atr14: number;
  macd: {
    histogram: number;
    signal: number;
  };
}

export interface UserPosition {
  hasPosition: boolean;
  entryPrice?: number;
  currentPnlPercent?: number;
  status: PositionStatus;
}

export interface AIAdvisorRequest {
  marketContext: MarketContext;
  technicalIndicators: TechnicalIndicators;
  userPosition?: UserPosition;
}

export interface AIAdvisorResponse {
  success: boolean;
  analysis?: string; // 마크다운 형식의 분석 결과
  error?: string;
}

