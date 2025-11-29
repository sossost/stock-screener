/**
 * 포트폴리오 관련 타입 정의
 */

import type { ScreenerCompany } from "@/types/screener";

/**
 * 포트폴리오에 추가된 종목 항목
 */
export interface PortfolioItem {
  id: number;
  sessionId: string;
  symbol: string;
  addedAt: string; // ISO 8601 timestamp
}

/**
 * 포트폴리오 API 응답 타입
 */
export interface PortfolioResponse {
  symbols: string[];
  data?: ScreenerCompany[]; // 재무 데이터가 포함된 경우
  trade_date?: string | null;
}

/**
 * 포트폴리오 추가 요청 타입
 */
export interface AddPortfolioRequest {
  symbol: string;
}

