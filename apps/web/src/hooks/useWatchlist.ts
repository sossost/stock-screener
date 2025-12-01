"use client";

import { useState, useEffect, useCallback } from "react";
import type { WatchlistResponse } from "@/types/watchlist";

/**
 * 관심종목(워치리스트) 상태 관리 커스텀 훅
 * @param autoFetch - 마운트 시 자동으로 관심종목을 가져올지 여부 (기본값: false)
 */
export function useWatchlist(autoFetch: boolean = false) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  // 관심종목 목록 조회
  const fetchWatchlist = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/watchlist");

      if (!response.ok) {
        throw new Error("Failed to fetch watchlist");
      }

      const data: WatchlistResponse = await response.json();
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
      fetchWatchlist();
    }
  }, [autoFetch, fetchWatchlist]);

  // 관심종목에 종목 추가
  const addToWatchlist = useCallback(
    async (symbol: string): Promise<boolean> => {
      try {
        setError(null);

        const response = await fetch("/api/watchlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ symbol }),
        });

        if (!response.ok && response.status !== 200) {
          throw new Error("Failed to add symbol to watchlist");
        }

        await fetchWatchlist();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      }
    },
    [fetchWatchlist]
  );

  // 관심종목에서 종목 제거
  const removeFromWatchlist = useCallback(
    async (symbol: string): Promise<boolean> => {
      try {
        setError(null);

        const response = await fetch(
          `/api/watchlist?symbol=${encodeURIComponent(symbol)}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to remove symbol from watchlist");
        }

        await fetchWatchlist();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      }
    },
    [fetchWatchlist]
  );

  // 종목이 관심종목에 있는지 확인
  const isInWatchlist = useCallback(
    (symbol: string): boolean => {
      return symbols.includes(symbol);
    },
    [symbols]
  );

  // 토글 (추가/제거)
  const toggleWatchlist = useCallback(
    async (symbol: string): Promise<boolean> => {
      if (isInWatchlist(symbol)) {
        return await removeFromWatchlist(symbol);
      } else {
        return await addToWatchlist(symbol);
      }
    },
    [isInWatchlist, addToWatchlist, removeFromWatchlist]
  );

  return {
    symbols,
    isLoading,
    error,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    toggleWatchlist,
    refresh: fetchWatchlist,
  };
}


