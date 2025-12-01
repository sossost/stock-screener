"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadDefaultFilters, loadSavedSortState } from "@/utils/filter-storage";
import { filterDefaults } from "@/lib/filters/schema";
import { FILTER_INIT_DELAY_MS } from "@/lib/filters/constants";
import type { useFilterState } from "./useFilterState";
import type { FilterState } from "@/lib/filters/summary";
import type { useSortState } from "./useSortState";

/**
 * 필터 초기화 훅
 * URL에 필터가 없을 때 기본값 적용 (우선순위: localStorage > filterDefaults)
 * 정렬 상태도 함께 초기화
 * @returns 초기화 완료 여부
 */
export function useFilterInitialization(
  filterState: ReturnType<typeof useFilterState>,
  sortState?: ReturnType<typeof useSortState>
): boolean {
  const searchParamsObj = useSearchParams();
  const hasInitialized = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeFilters = async () => {
      const hasUrlFilters = searchParamsObj.toString().length > 0;

      if (!hasUrlFilters) {
        // localStorage에서 로드, 없으면 filterDefaults 사용
        const savedFilters = loadDefaultFilters();
        const filtersToApply: Partial<FilterState> =
          savedFilters || filterDefaults;

        // 기본값을 URL에 업데이트 (undefined가 아닌 값만)
        const updatePromises: Promise<URLSearchParams | void>[] = [];
        if (filtersToApply.ordered !== undefined)
          updatePromises.push(filterState.setOrdered(filtersToApply.ordered));
        if (filtersToApply.goldenCross !== undefined)
          updatePromises.push(
            filterState.setGoldenCross(filtersToApply.goldenCross)
          );
        if (filtersToApply.justTurned !== undefined)
          updatePromises.push(
            filterState.setJustTurned(filtersToApply.justTurned)
          );
        if (filtersToApply.lookbackDays !== undefined)
          updatePromises.push(
            filterState.setLookbackDays(filtersToApply.lookbackDays)
          );
        if (filtersToApply.profitability !== undefined)
          updatePromises.push(
            filterState.setProfitability(filtersToApply.profitability)
          );
        if (filtersToApply.turnAround !== undefined)
          updatePromises.push(
            filterState.setTurnAround(filtersToApply.turnAround)
          );
        if (filtersToApply.revenueGrowth !== undefined)
          updatePromises.push(
            filterState.setRevenueGrowth(filtersToApply.revenueGrowth)
          );
        if (filtersToApply.incomeGrowth !== undefined)
          updatePromises.push(
            filterState.setIncomeGrowth(filtersToApply.incomeGrowth)
          );
        if (filtersToApply.revenueGrowthQuarters !== undefined)
          updatePromises.push(
            filterState.setRevenueGrowthQuarters(
              filtersToApply.revenueGrowthQuarters
            )
          );
        if (filtersToApply.incomeGrowthQuarters !== undefined)
          updatePromises.push(
            filterState.setIncomeGrowthQuarters(
              filtersToApply.incomeGrowthQuarters
            )
          );
        if (filtersToApply.revenueGrowthRate !== undefined)
          updatePromises.push(
            filterState.setRevenueGrowthRate(filtersToApply.revenueGrowthRate)
          );
        if (filtersToApply.incomeGrowthRate !== undefined)
          updatePromises.push(
            filterState.setIncomeGrowthRate(filtersToApply.incomeGrowthRate)
          );
        if (filtersToApply.pegFilter !== undefined)
          updatePromises.push(
            filterState.setPegFilter(filtersToApply.pegFilter)
          );
        if (filtersToApply.ma20Above !== undefined)
          updatePromises.push(
            filterState.setMa20Above(filtersToApply.ma20Above)
          );
        if (filtersToApply.ma50Above !== undefined)
          updatePromises.push(
            filterState.setMa50Above(filtersToApply.ma50Above)
          );
        if (filtersToApply.ma100Above !== undefined)
          updatePromises.push(
            filterState.setMa100Above(filtersToApply.ma100Above)
          );
        if (filtersToApply.ma200Above !== undefined)
          updatePromises.push(
            filterState.setMa200Above(filtersToApply.ma200Above)
          );

        // 정렬 상태도 함께 초기화
        if (sortState) {
          const savedSortState = loadSavedSortState();
          if (savedSortState) {
            updatePromises.push(sortState.setSort(savedSortState));
          }
        }

        // URL 업데이트 완료 대기
        try {
          await Promise.all(updatePromises);
          // 브라우저가 URL을 반영할 시간 확보
          await new Promise((resolve) =>
            setTimeout(resolve, FILTER_INIT_DELAY_MS)
          );
        } catch (error) {
          console.error("필터 초기화 실패:", error);
          // 에러 발생해도 초기화는 완료된 것으로 처리 (기본값 사용)
        }
      }

      // 초기화 완료 표시 (에러 발생 여부와 관계없이)
      setIsInitialized(true);
    };

    initializeFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isInitialized;
}
