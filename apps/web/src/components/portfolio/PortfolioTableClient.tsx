"use client";

import type { ScreenerCompany } from "@/types/screener";
import { StockTable } from "@/components/screener/StockTable";
import type { FilterState } from "@/lib/filters/summary";

interface PortfolioTableClientProps {
  symbols: string[];
  data: ScreenerCompany[];
  tradeDate: string | null;
}

// 포트폴리오에서는 필터를 사용하지 않으므로 모든 필터를 꺼둔 기본 상태로 렌더링한다.
export const portfolioFilterState: FilterState = {
  ordered: false,
  goldenCross: false,
  justTurned: false,
  lookbackDays: 10,
  profitability: "all",
  turnAround: false,
  revenueGrowth: false,
  incomeGrowth: false,
  revenueGrowthQuarters: 3,
  incomeGrowthQuarters: 3,
  revenueGrowthRate: null,
  incomeGrowthRate: null,
  pegFilter: false,
  ma20Above: false,
  ma50Above: false,
  ma100Above: false,
  ma200Above: false,
};

export function PortfolioTableClient({
  symbols,
  data,
  tradeDate,
}: PortfolioTableClientProps) {
  // 포트폴리오에 저장된 심볼만 렌더링
  const portfolioData = data.filter((item) => symbols.includes(item.symbol));

  return (
    <StockTable
      data={portfolioData}
      filterState={portfolioFilterState}
      tradeDate={tradeDate ?? undefined}
      totalCount={portfolioData.length}
    />
  );
}
