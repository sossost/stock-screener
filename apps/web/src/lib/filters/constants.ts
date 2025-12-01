/**
 * 필터 관련 상수 정의
 */

// 무한 스크롤 설정
export const INFINITE_SCROLL = {
  INITIAL_LOAD_COUNT: 100,
  LOAD_MORE_COUNT: 50,
} as const;

// 필터 기본값
export const FILTER_DEFAULTS = {
  LOOKBACK_DAYS: 10,
  REVENUE_GROWTH_QUARTERS: 3,
  INCOME_GROWTH_QUARTERS: 3,
  MIN_LOOKBACK_DAYS: 1,
  MAX_LOOKBACK_DAYS: 60,
} as const;

// URL 파라미터 값
export const URL_PARAM_VALUES = {
  TRUE: "true",
  FALSE: "false",
} as const;

// 쿼리 빌더 상수
export const QUERY_CONSTANTS = {
  MAX_RN_OFFSET: 1, // 현재일 포함
} as const;

// 필터 초기화 지연 시간 (ms)
export const FILTER_INIT_DELAY_MS = 100;
