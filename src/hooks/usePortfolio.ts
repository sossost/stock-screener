"use client";

import { useState, useEffect, useCallback } from "react";
import type { PortfolioResponse } from "@/types/portfolio";

/**
 * 포트폴리오 상태 관리 커스텀 훅
 * @param autoFetch - 마운트 시 자동으로 포트폴리오를 가져올지 여부 (기본값: false)
 */
export function usePortfolio(autoFetch: boolean = false) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  // 포트폴리오 목록 조회
  const fetchPortfolio = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/portfolio");

      if (!response.ok) {
        throw new Error("Failed to fetch portfolio");
      }

      const data: PortfolioResponse = await response.json();
      setSymbols(data.symbols || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSymbols([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드 (autoFetch가 true일 때만)
  useEffect(() => {
    if (autoFetch) {
      fetchPortfolio();
    }
  }, [autoFetch, fetchPortfolio]);

  // 포트폴리오에 종목 추가
  const addToPortfolio = useCallback(
    async (symbol: string): Promise<boolean> => {
      try {
        setError(null);

        const response = await fetch("/api/portfolio", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ symbol }),
        });

        if (!response.ok && response.status !== 200) {
          throw new Error("Failed to add symbol to portfolio");
        }

        // 목록 다시 조회
        await fetchPortfolio();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      }
    },
    [fetchPortfolio]
  );

  // 포트폴리오에서 종목 제거
  const removeFromPortfolio = useCallback(
    async (symbol: string): Promise<boolean> => {
      try {
        setError(null);

        const response = await fetch(
          `/api/portfolio?symbol=${encodeURIComponent(symbol)}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to remove symbol from portfolio");
        }

        // 목록 다시 조회
        await fetchPortfolio();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      }
    },
    [fetchPortfolio]
  );

  // 종목이 포트폴리오에 있는지 확인
  const isInPortfolio = useCallback(
    (symbol: string): boolean => {
      return symbols.includes(symbol);
    },
    [symbols]
  );

  // 토글 (추가/제거)
  const togglePortfolio = useCallback(
    async (symbol: string): Promise<boolean> => {
      if (isInPortfolio(symbol)) {
        return await removeFromPortfolio(symbol);
      } else {
        return await addToPortfolio(symbol);
      }
    },
    [isInPortfolio, addToPortfolio, removeFromPortfolio]
  );

  return {
    symbols,
    isLoading,
    error,
    addToPortfolio,
    removeFromPortfolio,
    isInPortfolio,
    togglePortfolio,
    refresh: fetchPortfolio,
  };
}
