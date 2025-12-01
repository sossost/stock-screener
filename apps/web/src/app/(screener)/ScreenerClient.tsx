"use client";

import React, { Suspense } from "react";
import { useFilterState } from "@/hooks/useFilterState";
import { useSortState } from "@/hooks/useSortState";
import { useFilterInitialization } from "@/hooks/useFilterInitialization";
import { useFilterActions } from "@/hooks/useFilterActions";
import { useTickerSearch } from "@/hooks/useTickerSearch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TableSkeleton } from "./TableSkeleton";
import type { FilterState } from "@/lib/filters/summary";
import type { ScreenerCompany } from "@/types/screener";
import { ScreenerDataWrapper } from "./ScreenerDataWrapper";
import { FilterView } from "./FilterView";

/**
 * 필터 및 검색 상태, 액션, UI를 모두 관리하는 레이어
 * 데이터 페칭은 하위 컴포넌트에서 처리
 */
export function ScreenerClient() {
  const filterState = useFilterState();
  const sortState = useSortState();

  // 필터 초기화 (localStorage에서 로드하여 URL에 적용)
  // 정렬 상태도 함께 초기화
  const isFilterInitialized = useFilterInitialization(filterState, sortState);

  // 필터 액션 관리 (적용, 리셋)
  // 정렬 상태도 함께 전달하여 필터 저장 시 정렬 상태 포함
  const { handleFilterApply, handleFilterReset, isPending } = useFilterActions(
    filterState,
    sortState
  );

  // 필터 상태를 정규화하여 하위 컴포넌트에 전달
  const normalizedFilterState = React.useMemo<FilterState>(
    () => ({
      ordered: filterState.ordered ?? undefined,
      goldenCross: filterState.goldenCross ?? undefined,
      justTurned: filterState.justTurned ?? undefined,
      lookbackDays: filterState.lookbackDays ?? undefined,
      profitability: filterState.profitability,
      turnAround: filterState.turnAround ?? undefined,
      revenueGrowth: filterState.revenueGrowth ?? undefined,
      revenueGrowthQuarters: filterState.revenueGrowthQuarters,
      revenueGrowthRate: filterState.revenueGrowthRate ?? null,
      incomeGrowth: filterState.incomeGrowth ?? undefined,
      incomeGrowthQuarters: filterState.incomeGrowthQuarters,
      incomeGrowthRate: filterState.incomeGrowthRate ?? null,
      pegFilter: filterState.pegFilter ?? undefined,
      ma20Above: filterState.ma20Above ?? undefined,
      ma50Above: filterState.ma50Above ?? undefined,
      ma100Above: filterState.ma100Above ?? undefined,
      ma200Above: filterState.ma200Above ?? undefined,
    }),
    [filterState]
  );

  const [screenerData, setScreenerData] = React.useState<ScreenerCompany[]>([]);
  const {
    tickerSearchInput,
    setTickerSearchInput,
    tickerSearch,
    filteredData,
    isSearching,
  } = useTickerSearch(screenerData);

  return (
    <Card className="px-4 pb-4">
      <CardHeader className="pt-4 px-4">
        <FilterView
          filterState={normalizedFilterState}
          isPending={isPending}
          onFilterApply={handleFilterApply}
          onFilterReset={handleFilterReset}
          tickerSearchInput={tickerSearchInput}
          onTickerSearchChange={setTickerSearchInput}
        />
      </CardHeader>
      <CardContent className="px-4">
        {isFilterInitialized ? (
          <Suspense fallback={<TableSkeleton />}>
            {/* 데이터 페칭 및 렌더링 */}
            <ScreenerDataWrapper
              filterState={normalizedFilterState}
              filteredData={filteredData}
              tickerSearch={tickerSearch}
              isSearching={isSearching}
              onDataLoad={setScreenerData}
            />
          </Suspense>
        ) : (
          <TableSkeleton />
        )}
      </CardContent>
    </Card>
  );
}
