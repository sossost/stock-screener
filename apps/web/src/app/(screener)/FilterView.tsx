"use client";

import React, { useState } from "react";
import { CategoryFilterBox } from "@/components/filters/CategoryFilterBox";
import { CategoryFilterDialog } from "@/components/filters/CategoryFilterDialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { FilterState, FilterCategory } from "@/lib/filters/summary";

type FilterViewProps = {
  filterState: FilterState;
  isPending: boolean;
  onFilterApply: (newState: Partial<FilterState>) => void;
  onFilterReset: (category: FilterCategory) => void;
  tickerSearchInput: string;
  onTickerSearchChange: (value: string) => void;
};

/**
 * 필터 UI를 렌더링하는 컴포넌트
 */
export function FilterView({
  filterState,
  isPending,
  onFilterApply,
  onFilterReset,
  tickerSearchInput,
  onTickerSearchChange,
}: FilterViewProps) {
  const [openCategory, setOpenCategory] = useState<FilterCategory | null>(null);

  return (
    <>
      {/* 필터 UI */}
      <div className="flex items-stretch gap-3 flex-wrap">
        <CategoryFilterBox
          category="ma"
          filterState={filterState}
          onClick={() => setOpenCategory("ma")}
          disabled={isPending}
        />
        <CategoryFilterBox
          category="growth"
          filterState={filterState}
          onClick={() => setOpenCategory("growth")}
          disabled={isPending}
        />
        <CategoryFilterBox
          category="profitability"
          filterState={filterState}
          onClick={() => setOpenCategory("profitability")}
          disabled={isPending}
        />

        {/* 티커 검색 인풋 */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="티커 검색..."
            value={tickerSearchInput}
            onChange={(e) => onTickerSearchChange(e.target.value)}
            className="pl-9 w-[200px] h-12"
            aria-label="티커 검색"
          />
        </div>
      </div>

      {/* 필터 다이얼로그 */}
      {openCategory && (
        <CategoryFilterDialog
          category={openCategory}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setOpenCategory(null);
            }
          }}
          filterState={filterState}
          onApply={onFilterApply}
          onReset={() => {
            onFilterReset(openCategory);
          }}
          disabled={isPending}
        />
      )}
    </>
  );
}
