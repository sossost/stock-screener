"use client";

import type { ScreenerCompany } from "@/types/screener";
import { StockTable } from "@/components/screener/StockTable";
import type { FilterState } from "@/lib/filters/summary";
import { EmptyState } from "@/components/ui/empty-state";
import { useRouter } from "next/navigation";

interface WatchlistTableClientProps {
  symbols: string[];
  data: ScreenerCompany[];
  tradeDate: string | null;
}

// 관심종목 페이지에서는 필터를 사용하지 않으므로 모든 필터를 꺼둔 기본 상태로 렌더링한다.
export const watchlistFilterState: FilterState = {
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

export function WatchlistTableClient({
  symbols,
  data,
  tradeDate,
}: WatchlistTableClientProps) {
  const router = useRouter();
  // 관심종목에 저장된 심볼만 렌더링
  const watchlistData = data.filter((item) => symbols.includes(item.symbol));

  if (symbols.length === 0 || watchlistData.length === 0) {
    return (
      <EmptyState
        title="관심종목이 비어 있습니다"
        description="스크리너에서 ⭐ 버튼을 눌러 관심종목을 추가해 보세요."
        action={{
          label: "스크리너로 이동",
          onClick: () => router.push("/"),
        }}
      />
    );
  }

  return (
    <StockTable
      data={watchlistData}
      filterState={watchlistFilterState}
      tradeDate={tradeDate ?? undefined}
      totalCount={watchlistData.length}
    />
  );
}
