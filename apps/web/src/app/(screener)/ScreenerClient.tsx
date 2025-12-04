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
import { filterDefaults } from "@/lib/filters/schema";
import { FilterSkeleton } from "./FilterSkeleton";

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
  // 계산 비용이 크지 않으므로 useMemo 없이 매 렌더마다 생성
  // 기본 필터(ordered, goldenCross, profitability)는 항상 표시
  const normalizedFilterState: FilterState = {
    // ordered와 goldenCross는 기본 필터이므로 항상 표시 (null이면 기본값 사용)
    ordered: (filterState.ordered ?? filterDefaults.ordered) ? true : undefined,
    goldenCross:
      (filterState.goldenCross ?? filterDefaults.goldenCross)
        ? true
        : undefined,
    justTurned: filterState.justTurned ?? undefined,
    lookbackDays: filterState.lookbackDays ?? undefined,
    // profitability는 기본값이 "profitable"이므로 항상 표시
    profitability: filterState.profitability ?? filterDefaults.profitability,
    turnAround: filterState.turnAround ?? undefined,
    revenueGrowth: filterState.revenueGrowth ?? undefined,
    revenueGrowthQuarters: filterState.revenueGrowthQuarters,
    revenueGrowthRate: filterState.revenueGrowthRate ?? null,
    incomeGrowth: filterState.incomeGrowth ?? undefined,
    incomeGrowthQuarters: filterState.incomeGrowthQuarters,
    incomeGrowthRate: filterState.incomeGrowthRate ?? null,
    pegFilter: filterState.pegFilter === true ? true : undefined,
    ma20Above: filterState.ma20Above ?? undefined,
    ma50Above: filterState.ma50Above ?? undefined,
    ma100Above: filterState.ma100Above ?? undefined,
    ma200Above: filterState.ma200Above ?? undefined,
    breakoutStrategy: filterState.breakoutStrategy ?? null,
    volumeFilter: filterState.volumeFilter ?? undefined,
    vcpFilter: filterState.vcpFilter ?? undefined,
    bodyFilter: filterState.bodyFilter ?? undefined,
    maConvergenceFilter: filterState.maConvergenceFilter ?? undefined,
  };

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
        {isFilterInitialized ? (
          <FilterView
            filterState={normalizedFilterState}
            rawFilterState={{
              ordered: filterState.ordered ?? undefined,
              goldenCross: filterState.goldenCross ?? undefined,
              justTurned: filterState.justTurned ?? undefined,
              lookbackDays: filterState.lookbackDays ?? undefined,
              profitability: filterState.profitability ?? undefined,
              turnAround: filterState.turnAround ?? undefined,
              revenueGrowth: filterState.revenueGrowth ?? undefined,
              revenueGrowthQuarters: filterState.revenueGrowthQuarters,
              revenueGrowthRate: filterState.revenueGrowthRate ?? null,
              incomeGrowth: filterState.incomeGrowth ?? undefined,
              incomeGrowthQuarters: filterState.incomeGrowthQuarters,
              incomeGrowthRate: filterState.incomeGrowthRate ?? null,
              pegFilter: filterState.pegFilter === true ? true : undefined,
              ma20Above: filterState.ma20Above ?? undefined,
              ma50Above: filterState.ma50Above ?? undefined,
              ma100Above: filterState.ma100Above ?? undefined,
              ma200Above: filterState.ma200Above ?? undefined,
              breakoutStrategy: filterState.breakoutStrategy ?? null,
              volumeFilter: filterState.volumeFilter ?? undefined,
              vcpFilter: filterState.vcpFilter ?? undefined,
              bodyFilter: filterState.bodyFilter ?? undefined,
              maConvergenceFilter: filterState.maConvergenceFilter ?? undefined,
            }}
            isPending={isPending}
            onFilterApply={handleFilterApply}
            onFilterReset={handleFilterReset}
            tickerSearchInput={tickerSearchInput}
            onTickerSearchChange={setTickerSearchInput}
          />
        ) : (
          <FilterSkeleton />
        )}
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
