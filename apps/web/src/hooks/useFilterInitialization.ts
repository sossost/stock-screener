"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();

  useEffect(() => {
    const initializeFilters = async () => {
      // 이미 초기화되었으면 더 이상 실행하지 않음
      if (hasInitialized.current) {
        return;
      }

      hasInitialized.current = true;

      // URL에 필터가 이미 있으면 localStorage를 건너뛰고 바로 초기화 완료
      const hasUrlFilters = Array.from(searchParams.keys()).length > 0;
      if (hasUrlFilters) {
        // 정렬 상태만 초기화 (URL에 필터가 있으면 필터는 URL 우선)
        if (sortState) {
          const savedSortState = loadSavedSortState();
          if (savedSortState) {
            await sortState.setSort(savedSortState);
          }
        }
        setIsInitialized(true);
        return;
      }

      // URL에 필터가 없을 때만 localStorage에서 필터 로드
      // 1순위: localStorage, 없으면 filterDefaults 사용
      const savedFilters = loadDefaultFilters();
      const filtersToApply: Partial<FilterState> = savedFilters
        ? { ...filterDefaults, ...savedFilters }
        : filterDefaults;

      // 기본/저장된 필터를 URL에 적용 (localStorage가 항상 우선)
      // 모든 필터 설정을 병렬로 처리하여 초기화 속도 개선
      const filterPromises: Promise<unknown>[] = [
        filterState.setOrdered(
          filtersToApply.ordered ?? filterDefaults.ordered
        ),
        filterState.setGoldenCross(
          filtersToApply.goldenCross ?? filterDefaults.goldenCross
        ),
        filterState.setProfitability(
          filtersToApply.profitability ?? filterDefaults.profitability
        ),
      ];

      if (filtersToApply.justTurned !== undefined)
        filterPromises.push(
          filterState.setJustTurned(filtersToApply.justTurned)
        );
      if (filtersToApply.lookbackDays !== undefined)
        filterPromises.push(
          filterState.setLookbackDays(filtersToApply.lookbackDays)
        );
      if (filtersToApply.turnAround !== undefined)
        filterPromises.push(
          filterState.setTurnAround(filtersToApply.turnAround)
        );
      if (filtersToApply.revenueGrowth !== undefined)
        filterPromises.push(
          filterState.setRevenueGrowth(filtersToApply.revenueGrowth)
        );
      if (filtersToApply.incomeGrowth !== undefined)
        filterPromises.push(
          filterState.setIncomeGrowth(filtersToApply.incomeGrowth)
        );
      if (filtersToApply.revenueGrowthQuarters !== undefined)
        filterPromises.push(
          filterState.setRevenueGrowthQuarters(
            filtersToApply.revenueGrowthQuarters
          )
        );
      if (filtersToApply.incomeGrowthQuarters !== undefined)
        filterPromises.push(
          filterState.setIncomeGrowthQuarters(
            filtersToApply.incomeGrowthQuarters
          )
        );
      if (filtersToApply.revenueGrowthRate !== undefined)
        filterPromises.push(
          filterState.setRevenueGrowthRate(filtersToApply.revenueGrowthRate)
        );
      if (filtersToApply.incomeGrowthRate !== undefined)
        filterPromises.push(
          filterState.setIncomeGrowthRate(filtersToApply.incomeGrowthRate)
        );
      if (filtersToApply.pegFilter !== undefined) {
        filterPromises.push(
          filterState.setPegFilter(
            filtersToApply.pegFilter === true ? true : null
          )
        );
      }
      if (filtersToApply.ma20Above !== undefined)
        filterPromises.push(
          filterState.setMa20Above(filtersToApply.ma20Above)
        );
      if (filtersToApply.ma50Above !== undefined)
        filterPromises.push(
          filterState.setMa50Above(filtersToApply.ma50Above)
        );
      if (filtersToApply.ma100Above !== undefined)
        filterPromises.push(
          filterState.setMa100Above(filtersToApply.ma100Above)
        );
      if (filtersToApply.ma200Above !== undefined)
        filterPromises.push(
          filterState.setMa200Above(filtersToApply.ma200Above)
        );
      if (filtersToApply.breakoutStrategy !== undefined)
        filterPromises.push(
          filterState.setBreakoutStrategy(filtersToApply.breakoutStrategy)
        );
      if (filtersToApply.volumeFilter !== undefined)
        filterPromises.push(
          filterState.setVolumeFilter(filtersToApply.volumeFilter)
        );
      if (filtersToApply.vcpFilter !== undefined)
        filterPromises.push(
          filterState.setVcpFilter(filtersToApply.vcpFilter)
        );
      if (filtersToApply.bodyFilter !== undefined)
        filterPromises.push(
          filterState.setBodyFilter(filtersToApply.bodyFilter)
        );
      if (filtersToApply.maConvergenceFilter !== undefined)
        filterPromises.push(
          filterState.setMaConvergenceFilter(
            filtersToApply.maConvergenceFilter
          )
        );

      // 모든 필터 설정을 병렬로 실행
      await Promise.all(filterPromises);

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
