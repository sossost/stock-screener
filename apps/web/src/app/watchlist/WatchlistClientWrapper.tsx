"use client";

import { useWatchlist } from "@/hooks/useWatchlist";
import { useEffect } from "react";

/**
 * 클라이언트 사이드 관심종목(워치리스트) 동기화를 위한 래퍼
 * 서버에서 렌더링된 데이터와 클라이언트 상태를 동기화
 */
export function WatchlistClientWrapper() {
  const { refresh } = useWatchlist(false);

  // 마운트 시 관심종목 상태 동기화 (관심종목 버튼 상태 업데이트용)
  useEffect(() => {
    refresh();
  }, [refresh]);

  return null;
}
