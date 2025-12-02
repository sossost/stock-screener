/**
 * AI Advisor 데이터 수집 및 API 호출 훅
 * 수동 호출 방식 (버튼 클릭 시 분석)
 * 하루 동안 캐싱 (종가가 변하지 않으므로)
 */

import { useState, useEffect } from "react";
import type { AIAdvisorResponse } from "@/types/ai-advisor";
import {
  loadAIAdvisorCache,
  saveAIAdvisorCache,
  cleanupOldAIAdvisorCache,
} from "@/utils/ai-advisor-cache";

interface UseAIAdvisorOptions {
  symbol: string;
  currentPrice: number | null;
}

export function useAIAdvisor({ symbol, currentPrice }: UseAIAdvisorOptions) {
  const [data, setData] = useState<AIAdvisorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트 마운트 시 오래된 캐시 정리 (한 번만 실행)
  useEffect(() => {
    cleanupOldAIAdvisorCache();
  }, []);

  // 캐시에서 데이터 로드 (초기 로드 시)
  useEffect(() => {
    if (!symbol || !currentPrice) {
      return;
    }

    const cached = loadAIAdvisorCache(symbol, currentPrice);
    if (cached) {
      setData(cached);
    }
  }, [symbol, currentPrice]);

  const analyze = async () => {
    if (!symbol || !currentPrice) {
      setError("종목 정보가 없습니다");
      return;
    }

    // 캐시 확인
    const cached = loadAIAdvisorCache(symbol, currentPrice);
    if (cached) {
      setData(cached);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol,
          currentPrice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "분석 요청에 실패했습니다");
      }

      const result: AIAdvisorResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "분석 결과를 생성할 수 없습니다");
      }

      // 캐시에 저장
      saveAIAdvisorCache(symbol, currentPrice, result);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data,
    isLoading,
    error,
    analyze,
  };
}
