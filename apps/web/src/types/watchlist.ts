/**
 * 관심종목(워치리스트) 관련 타입 정의
 */

import type { ScreenerCompany } from "@/types/screener";

/**
 * 관심종목에 추가된 종목 항목
 */
export interface WatchlistItem {
  id: number;
  sessionId: string;
  symbol: string;
  addedAt: string; // ISO 8601 timestamp
}

/**
 * 관심종목 API 응답 타입
 */
export interface WatchlistResponse {
  symbols: string[];
  data?: ScreenerCompany[]; // 재무 데이터가 포함된 경우
  trade_date?: string | null;
}

/**
 * 관심종목 추가 요청 타입
 */
export interface AddWatchlistRequest {
  symbol: string;
}


