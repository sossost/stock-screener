"use client";

import { usePortfolio } from "@/hooks/usePortfolio";
import { useEffect } from "react";

/**
 * 클라이언트 사이드 포트폴리오 동기화를 위한 래퍼
 * 서버에서 렌더링된 데이터와 클라이언트 상태를 동기화
 */
export function PortfolioClientWrapper() {
  const { refresh } = usePortfolio(false);

  // 마운트 시 포트폴리오 상태 동기화 (포트폴리오 버튼 상태 업데이트용)
  useEffect(() => {
    refresh();
  }, [refresh]);

  return null;
}

