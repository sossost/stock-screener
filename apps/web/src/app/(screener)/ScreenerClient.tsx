"use client";

import React, { useState } from "react";
import { useFilterState } from "@/hooks/useFilterState";
import { useTickerSearch } from "@/hooks/useTickerSearch";
import { useFilterActions } from "@/hooks/useFilterActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryFilterBox } from "@/components/filters/CategoryFilterBox";
import { CategoryFilterDialog } from "@/components/filters/CategoryFilterDialog";
import type { FilterState, FilterCategory } from "@/lib/filters/summary";
import type { ScreenerClientProps } from "@/types/golden-cross";
import { StockTable } from "@/components/screener/StockTable";
import { TableSkeleton } from "./TableSkeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { StateMessage } from "@/components/common/StateMessage";

export default function ScreenerClient({
  data,
  tradeDate,
  error,
}: ScreenerClientProps) {
  // 필터 상태 관리 훅
  const filterState = useFilterState();
  const {
    ordered,
    goldenCross,
    justTurned,
    lookbackDays,
    profitability,
    turnAround,
    revenueGrowth,
    revenueGrowthQuarters,
    revenueGrowthRate,
    incomeGrowth,
    incomeGrowthQuarters,
    incomeGrowthRate,
    pegFilter,
  } = filterState;

  // 필터 팝업 상태 (카테고리별)
  const [openCategory, setOpenCategory] = useState<FilterCategory | null>(null);

  // 티커 검색 훅
  const {
    tickerSearchInput,
    setTickerSearchInput,
    tickerSearch,
    filteredData,
    isSearching,
  } = useTickerSearch(data);

  // 필터 액션 훅
  const { handleFilterApply, handleFilterReset, isPending } =
    useFilterActions(filterState);

  // 현재 필터 상태
  const currentFilterState: FilterState = {
    ordered,
    goldenCross,
    justTurned,
    lookbackDays,
    profitability,
    turnAround,
    revenueGrowth,
    revenueGrowthQuarters,
    revenueGrowthRate: revenueGrowthRate ?? null,
    incomeGrowth,
    incomeGrowthQuarters,
    incomeGrowthRate: incomeGrowthRate ?? null,
    pegFilter,
  };

  if (error) {
    return (
      <Card className="px-4 pb-4">
        <CardHeader className="pt-4 px-4">
          <CardTitle className="text-xl font-bold"></CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <StateMessage
            variant="error"
            title="데이터를 불러오지 못했습니다"
            description={error}
          />
        </CardContent>
      </Card>
    );
  }

  const noData = !isPending && !isSearching && filteredData.length === 0;

  return (
    <Card className="px-4 pb-4">
      <CardHeader className="pt-4 px-4">
        <CardTitle className="text-xl font-bold"></CardTitle>
        <div className="flex items-stretch gap-3 flex-wrap">
          {/* 이평선 필터박스 */}
          <CategoryFilterBox
            category="ma"
            filterState={currentFilterState}
            onClick={() => setOpenCategory("ma")}
            disabled={isPending}
          />

          {/* 성장성 필터박스 */}
          <CategoryFilterBox
            category="growth"
            filterState={currentFilterState}
            onClick={() => setOpenCategory("growth")}
            disabled={isPending}
          />

          {/* 수익성 필터박스 */}
          <CategoryFilterBox
            category="profitability"
            filterState={currentFilterState}
            onClick={() => setOpenCategory("profitability")}
            disabled={isPending}
          />

          {/* 티커 검색 인풋 - 필터 라인 오른쪽 끝 */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="티커 검색..."
              value={tickerSearchInput}
              onChange={(e) => setTickerSearchInput(e.target.value)}
              className="pl-9 w-[200px] h-12"
            />
          </div>
        </div>

        {/* 카테고리별 필터 설정 팝업 */}
        {openCategory && (
          <CategoryFilterDialog
            category={openCategory}
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                setOpenCategory(null);
              }
            }}
            filterState={currentFilterState}
            onApply={handleFilterApply}
            onReset={() => handleFilterReset(openCategory)}
            disabled={isPending}
          />
        )}
      </CardHeader>
      <CardContent className="px-4">
        {isPending && !isSearching ? (
          <TableSkeleton />
        ) : noData ? (
          <StateMessage
            title="표시할 데이터가 없습니다"
            description="필터 조건을 완화하거나 다른 티커를 검색해 보세요."
          />
        ) : (
          <StockTable
            data={filteredData}
            filterState={currentFilterState}
            tickerSearch={tickerSearch}
            tradeDate={tradeDate}
            totalCount={data.length}
          />
        )}
      </CardContent>
    </Card>
  );
}
