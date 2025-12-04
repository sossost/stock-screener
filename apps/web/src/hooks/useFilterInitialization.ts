"use client";

import { useEffect, useRef, useState } from "react";
import { loadDefaultFilters, loadSavedSortState } from "@/utils/filter-storage";
import { filterDefaults } from "@/lib/filters/schema";
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
  const hasInitialized = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeFilters = async () => {
      // 이미 초기화되었으면 더 이상 실행하지 않음
      if (hasInitialized.current) {
        return;
      }

      hasInitialized.current = true;

      // 1순위: localStorage, 없으면 filterDefaults 사용
      const savedFilters = loadDefaultFilters();
      const filtersToApply: Partial<FilterState> = savedFilters
        ? { ...filterDefaults, ...savedFilters }
        : filterDefaults;

      // 기본/저장된 필터를 URL에 적용 (localStorage가 항상 우선)
      // 모든 set 함수는 await으로 동기적으로 처리하여 URL과 UI 상태를 즉시 반영
      await filterState.setOrdered(
        filtersToApply.ordered ?? filterDefaults.ordered
      );
      await filterState.setGoldenCross(
        filtersToApply.goldenCross ?? filterDefaults.goldenCross
      );
      await filterState.setProfitability(
        filtersToApply.profitability ?? filterDefaults.profitability
      );
      if (filtersToApply.justTurned !== undefined)
        await filterState.setJustTurned(filtersToApply.justTurned);
      if (filtersToApply.lookbackDays !== undefined)
        await filterState.setLookbackDays(filtersToApply.lookbackDays);
      if (filtersToApply.turnAround !== undefined)
        await filterState.setTurnAround(filtersToApply.turnAround);
      if (filtersToApply.revenueGrowth !== undefined)
        await filterState.setRevenueGrowth(filtersToApply.revenueGrowth);
      if (filtersToApply.incomeGrowth !== undefined)
        await filterState.setIncomeGrowth(filtersToApply.incomeGrowth);
      if (filtersToApply.revenueGrowthQuarters !== undefined)
        await filterState.setRevenueGrowthQuarters(
          filtersToApply.revenueGrowthQuarters
        );
      if (filtersToApply.incomeGrowthQuarters !== undefined)
        await filterState.setIncomeGrowthQuarters(
          filtersToApply.incomeGrowthQuarters
        );
      if (filtersToApply.revenueGrowthRate !== undefined)
        await filterState.setRevenueGrowthRate(
          filtersToApply.revenueGrowthRate
        );
      if (filtersToApply.incomeGrowthRate !== undefined)
        await filterState.setIncomeGrowthRate(filtersToApply.incomeGrowthRate);
      if (filtersToApply.pegFilter !== undefined) {
        if (filtersToApply.pegFilter === true) {
          await filterState.setPegFilter(true);
        } else {
          await filterState.setPegFilter(null);
        }
      }
      if (filtersToApply.ma20Above !== undefined)
        await filterState.setMa20Above(filtersToApply.ma20Above);
      if (filtersToApply.ma50Above !== undefined)
        await filterState.setMa50Above(filtersToApply.ma50Above);
      if (filtersToApply.ma100Above !== undefined)
        await filterState.setMa100Above(filtersToApply.ma100Above);
      if (filtersToApply.ma200Above !== undefined)
        await filterState.setMa200Above(filtersToApply.ma200Above);
      if (filtersToApply.breakoutStrategy !== undefined)
        await filterState.setBreakoutStrategy(filtersToApply.breakoutStrategy);
      if (filtersToApply.volumeFilter !== undefined)
        await filterState.setVolumeFilter(filtersToApply.volumeFilter);
      if (filtersToApply.vcpFilter !== undefined)
        await filterState.setVcpFilter(filtersToApply.vcpFilter);
      if (filtersToApply.bodyFilter !== undefined)
        await filterState.setBodyFilter(filtersToApply.bodyFilter);
      if (filtersToApply.maConvergenceFilter !== undefined)
        await filterState.setMaConvergenceFilter(
          filtersToApply.maConvergenceFilter
        );

      // 정렬 상태도 함께 초기화 (localStorage 값이 있으면 항상 적용)
      if (sortState) {
        const savedSortState = loadSavedSortState();
        if (savedSortState) {
          await sortState.setSort(savedSortState);
        }
      }

      // 초기화 완료 표시
      setIsInitialized(true);
    };

    initializeFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isInitialized;
}
