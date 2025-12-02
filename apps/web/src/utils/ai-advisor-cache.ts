/**
 * AI Advisor 분석 결과 캐싱 유틸리티
 * 하루 동안 캐시 유지 (종가가 변하지 않으므로)
 */

import type { AIAdvisorResponse } from "@/types/ai-advisor";

const CACHE_PREFIX = "ai-advisor-cache";
const CACHE_VERSION = "1";

interface CachedData {
  version: string;
  date: string; // YYYY-MM-DD 형식
  symbol: string;
  currentPrice: number;
  data: AIAdvisorResponse;
  timestamp: number; // 캐시 생성 시각 (ms)
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

/**
 * 캐시 키 생성
 */
function getCacheKey(symbol: string, date: string): string {
  return `${CACHE_PREFIX}:${symbol}:${date}:${CACHE_VERSION}`;
}

/**
 * AI Advisor 분석 결과를 캐시에 저장
 */
export function saveAIAdvisorCache(
  symbol: string,
  currentPrice: number,
  data: AIAdvisorResponse
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const date = getTodayDateString();
    const cacheKey = getCacheKey(symbol, date);

    const cachedData: CachedData = {
      version: CACHE_VERSION,
      date,
      symbol,
      currentPrice,
      data,
      timestamp: Date.now(),
    };

    const json = JSON.stringify(cachedData);
    localStorage.setItem(cacheKey, json);
  } catch (error) {
    console.error("[AIAdvisorCache] Failed to save cache:", error);
  }
}

/**
 * AI Advisor 분석 결과를 캐시에서 읽기
 * @returns 캐시된 데이터 또는 null (캐시가 없거나 만료된 경우)
 */
export function loadAIAdvisorCache(
  symbol: string,
  currentPrice: number
): AIAdvisorResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const date = getTodayDateString();
    const cacheKey = getCacheKey(symbol, date);

    const stored = localStorage.getItem(cacheKey);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as CachedData;

    // 유효성 검증
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== CACHE_VERSION ||
      parsed.date !== date || // 날짜가 다르면 만료
      parsed.symbol !== symbol ||
      parsed.currentPrice !== currentPrice || // 가격이 다르면 무효
      !parsed.data
    ) {
      // 무효한 캐시 삭제
      localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error("[AIAdvisorCache] Failed to load cache:", error);
    // 파싱 실패 시 캐시 삭제
    try {
      const date = getTodayDateString();
      const cacheKey = getCacheKey(symbol, date);
      localStorage.removeItem(cacheKey);
    } catch (removeError) {
      console.error(
        "[AIAdvisorCache] Failed to remove invalid cache:",
        removeError
      );
    }
    return null;
  }
}

/**
 * 특정 종목의 캐시 삭제
 */
export function clearAIAdvisorCache(symbol: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const date = getTodayDateString();
    const cacheKey = getCacheKey(symbol, date);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error("[AIAdvisorCache] Failed to clear cache:", error);
  }
}

/**
 * 모든 AI Advisor 캐시 삭제 (오래된 캐시 정리용)
 */
export function clearAllAIAdvisorCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error("[AIAdvisorCache] Failed to clear all cache:", error);
  }
}

/**
 * 오래된 캐시 정리 (어제 이전의 캐시 삭제)
 */
export function cleanupOldAIAdvisorCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const today = getTodayDateString();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored) as CachedData;
            // 날짜가 오늘이 아니면 삭제
            if (parsed.date !== today) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // 파싱 실패한 키도 삭제
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error("[AIAdvisorCache] Failed to cleanup old cache:", error);
  }
}
