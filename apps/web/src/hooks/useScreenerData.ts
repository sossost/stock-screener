"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/config/constants";
import { parseFilters, buildQueryParams } from "@/lib/filters/schema";
import type { ScreenerCompany } from "@/types/screener";

type ScreenerData = {
  data: ScreenerCompany[];
  trade_date: string | null;
  error?: string | null;
};

async function fetchScreenerData(
  params: URLSearchParams
): Promise<ScreenerData> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/screener/stocks?${params.toString()}`,
      {
        next: {
          revalidate: 6 * 60 * 60, // 6 hours
        },
      }
    );

    if (!response.ok) {
      return {
        data: [],
        trade_date: null,
        error: `데이터를 불러오지 못했습니다 (status ${response.status})`,
      };
    }

    return response.json();
  } catch {
    return {
      data: [],
      trade_date: null,
      error: "데이터를 불러오지 못했습니다. 네트워크 상태를 확인해 주세요.",
    };
  }
}

/**
 * 스크리너 데이터 페칭 훅 (useSuspenseQuery 사용)
 * 필터가 준비된 후에만 호출되어야 함
 */
export function useScreenerData() {
  const searchParams = useSearchParams();

  // URL 파라미터를 필터로 파싱
  const filters = parseFilters(searchParams);
  const params = buildQueryParams(filters);

  // 쿼리 키는 필터 파라미터를 기반으로 생성
  const queryKey = ["screener", "stocks", params.toString()];

  const { data } = useSuspenseQuery<ScreenerData>({
    queryKey,
    queryFn: () => fetchScreenerData(params),
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 12 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return data;
}
