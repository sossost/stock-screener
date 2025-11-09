import React from "react";
import GoldenCrossClient from "./GoldenCrossClient";
import { CACHE_TAGS } from "@/lib/constants";
import { API_BASE_URL, CACHE_DURATION } from "@/lib/constants";

type SearchParams = {
  ordered?: string;
  goldenCross?: string;
  justTurned?: string;
  lookbackDays?: string;
  profitability?: string;
  revenueGrowth?: string;
  revenueGrowthQuarters?: string;
  revenueGrowthRate?: string;
  incomeGrowth?: string;
  incomeGrowthQuarters?: string;
  incomeGrowthRate?: string;
  pegFilter?: string;
};

async function fetchGoldenCrossData(searchParams: SearchParams) {
  const ordered = searchParams.ordered !== "false"; // 기본값: true
  const goldenCross = searchParams.goldenCross !== "false"; // 기본값: true
  const justTurned = searchParams.justTurned === "true";
  const lookbackDays = searchParams.lookbackDays || "10";
  const profitability = searchParams.profitability || "all";
  const revenueGrowth = searchParams.revenueGrowth === "true";
  const revenueGrowthQuarters = searchParams.revenueGrowthQuarters || "3";
  const revenueGrowthRate = searchParams.revenueGrowthRate;
  const incomeGrowth = searchParams.incomeGrowth === "true";
  const incomeGrowthQuarters = searchParams.incomeGrowthQuarters || "3";
  const incomeGrowthRate = searchParams.incomeGrowthRate;
  const pegFilter = searchParams.pegFilter === "true";

  const params = new URLSearchParams({
    ordered: ordered.toString(),
    goldenCross: goldenCross.toString(),
    justTurned: justTurned.toString(),
    lookbackDays: lookbackDays,
    profitability: profitability,
    revenueGrowth: revenueGrowth.toString(),
    revenueGrowthQuarters: revenueGrowthQuarters,
    incomeGrowth: incomeGrowth.toString(),
    incomeGrowthQuarters: incomeGrowthQuarters,
    pegFilter: pegFilter.toString(),
  });

  if (revenueGrowthRate) {
    params.append("revenueGrowthRate", revenueGrowthRate);
  }
  if (incomeGrowthRate) {
    params.append("incomeGrowthRate", incomeGrowthRate);
  }

  // 캐시 태그 생성 (필터별로 다른 태그 - 모든 필터 포함)
  const cacheTag = `golden-cross-${ordered}-${goldenCross}-${justTurned}-${lookbackDays}-${profitability}-${revenueGrowth}-${revenueGrowthQuarters}-${
    revenueGrowthRate ?? ""
  }-${incomeGrowth}-${incomeGrowthQuarters}-${
    incomeGrowthRate ?? ""
  }-${pegFilter}`;

  // 서버 사이드에서 내부 API 호출
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
    return { data: [], trade_date: null };
  }

  return response.json();
}

type DataWrapperProps = {
  searchParams: SearchParams;
};

export async function DataWrapper({ searchParams }: DataWrapperProps) {
  const data = await fetchGoldenCrossData(searchParams);

  return (
    <GoldenCrossClient data={data.data || []} tradeDate={data.trade_date} />
  );
}
