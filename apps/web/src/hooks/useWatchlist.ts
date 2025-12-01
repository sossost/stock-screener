"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { WatchlistResponse } from "@/types/watchlist";

const WATCHLIST_QUERY_KEY = ["watchlist"];

/**
 * 관심종목 목록 조회 함수
 */
async function fetchWatchlist(): Promise<WatchlistResponse> {
  const response = await fetch("/api/watchlist");

  if (!response.ok) {
    throw new Error("Failed to fetch watchlist");
  }

  return response.json();
}

/**
 * 관심종목(워치리스트) 상태 관리 커스텀 훅 (React Query 사용)
 * @param autoFetch - 마운트 시 자동으로 관심종목을 가져올지 여부 (기본값: false)
 */
export function useWatchlist(autoFetch: boolean = false) {
  const queryClient = useQueryClient();

  // 관심종목 목록 조회 (React Query)
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: WATCHLIST_QUERY_KEY,
    queryFn: fetchWatchlist,
    enabled: autoFetch,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    gcTime: 10 * 60 * 1000, // 10분간 메모리 유지
  });

  const symbols = useMemo(() => data?.symbols || [], [data?.symbols]);
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Unknown error"
    : null;

  // 관심종목에 종목 추가 (Mutation with Optimistic Update)
  const addMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol }),
      });

      if (!response.ok) {
        throw new Error("Failed to add symbol to watchlist");
      }

      return response.json();
    },
    onMutate: async (symbol: string) => {
      // 진행 중인 쿼리 취소 (낙관적 업데이트를 덮어쓰지 않도록)
      await queryClient.cancelQueries({ queryKey: WATCHLIST_QUERY_KEY });

      // 이전 상태 백업 (롤백용)
      const previousData =
        queryClient.getQueryData<WatchlistResponse>(WATCHLIST_QUERY_KEY);

      // 낙관적 업데이트: 즉시 UI에 반영
      queryClient.setQueryData<WatchlistResponse>(
        WATCHLIST_QUERY_KEY,
        (old) => {
          if (!old) {
            return { symbols: [symbol] };
          }
          // 이미 존재하면 추가하지 않음
          if (old.symbols.includes(symbol)) {
            return old;
          }
          return { symbols: [...old.symbols, symbol] };
        }
      );

      // 롤백을 위한 컨텍스트 반환
      return { previousData };
    },
    onError: (err, symbol, context) => {
      // 실패 시 이전 상태로 롤백
      if (context?.previousData) {
        queryClient.setQueryData(WATCHLIST_QUERY_KEY, context.previousData);
      }
      console.error("[useWatchlist] addToWatchlist error:", err);
    },
    // onSuccess 제거: 낙관적 업데이트가 이미 올바른 상태를 반영하므로
    // 서버와의 동기화는 필요할 때만 (예: 페이지 새로고침, 다른 탭에서 변경 등)
  });

  // 관심종목에서 종목 제거 (Mutation with Optimistic Update)
  const removeMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const response = await fetch(
        `/api/watchlist?symbol=${encodeURIComponent(symbol)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove symbol from watchlist");
      }

      return response.json();
    },
    onMutate: async (symbol: string) => {
      // 진행 중인 쿼리 취소 (낙관적 업데이트를 덮어쓰지 않도록)
      await queryClient.cancelQueries({ queryKey: WATCHLIST_QUERY_KEY });

      // 이전 상태 백업 (롤백용)
      const previousData =
        queryClient.getQueryData<WatchlistResponse>(WATCHLIST_QUERY_KEY);

      // 낙관적 업데이트: 즉시 UI에서 제거
      queryClient.setQueryData<WatchlistResponse>(
        WATCHLIST_QUERY_KEY,
        (old) => {
          if (!old) {
            return { symbols: [] };
          }
          return { symbols: old.symbols.filter((s) => s !== symbol) };
        }
      );

      // 롤백을 위한 컨텍스트 반환
      return { previousData };
    },
    onError: (err, symbol, context) => {
      // 실패 시 이전 상태로 롤백
      if (context?.previousData) {
        queryClient.setQueryData(WATCHLIST_QUERY_KEY, context.previousData);
      }
      console.error("[useWatchlist] removeFromWatchlist error:", err);
    },
    // onSuccess 제거: 낙관적 업데이트가 이미 올바른 상태를 반영하므로
    // 서버와의 동기화는 필요할 때만 (예: 페이지 새로고침, 다른 탭에서 변경 등)
  });

  // 관심종목에 종목 추가
  const addToWatchlist = useCallback(
    async (symbol: string): Promise<boolean> => {
      try {
        await addMutation.mutateAsync(symbol);
        return true;
      } catch (err) {
        console.error("[useWatchlist] addToWatchlist error:", err);
        return false;
      }
    },
    [addMutation]
  );

  // 관심종목에서 종목 제거
  const removeFromWatchlist = useCallback(
    async (symbol: string): Promise<boolean> => {
      try {
        await removeMutation.mutateAsync(symbol);
        return true;
      } catch (err) {
        console.error("[useWatchlist] removeFromWatchlist error:", err);
        return false;
      }
    },
    [removeMutation]
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
      // 캐시에서 최신 상태 확인 (낙관적 업데이트 반영)
      const currentData =
        queryClient.getQueryData<WatchlistResponse>(WATCHLIST_QUERY_KEY);
      const isCurrentlyInWatchlist =
        currentData?.symbols.includes(symbol) ?? false;

      if (isCurrentlyInWatchlist) {
        return await removeFromWatchlist(symbol);
      } else {
        return await addToWatchlist(symbol);
      }
    },
    [queryClient, addToWatchlist, removeFromWatchlist]
  );

  return {
    symbols,
    isLoading,
    error,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    toggleWatchlist,
    refresh: () => refetch(),
  };
}
