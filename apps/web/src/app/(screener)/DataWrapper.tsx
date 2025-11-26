import React from "react";
import ScreenerClient from "./ScreenerClient";
import { CACHE_TAGS } from "@/lib/config/constants";
import { API_BASE_URL, CACHE_DURATION } from "@/lib/config/constants";
import {
  parseFilters,
  buildQueryParams,
  buildCacheTag,
} from "@/lib/filters/schema";

type SearchParams = Record<string, string | string[] | undefined>;

async function fetchScreenerData(searchParams: SearchParams) {
  const filters = parseFilters(searchParams);
  const params = buildQueryParams(filters);
  const cacheTag = buildCacheTag(filters);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/screener/golden-cross?${params.toString()}`,
      {
        next: {
          revalidate: CACHE_DURATION.ONE_DAY, // 24시간 캐싱
          tags: [CACHE_TAGS.GOLDEN_CROSS, cacheTag],
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

type DataWrapperProps = {
  searchParams: SearchParams;
};

export async function DataWrapper({ searchParams }: DataWrapperProps) {
  const data = await fetchScreenerData(searchParams);

  return (
    <ScreenerClient
      data={data.data || []}
      tradeDate={data.trade_date}
      error={(data as any).error || null}
    />
  );
}
