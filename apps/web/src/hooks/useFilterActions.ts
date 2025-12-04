import { useRouter } from "next/navigation";
import { useTransition, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { FilterState, FilterCategory } from "@/lib/filters/summary";
import { useFilterState } from "@/hooks/useFilterState";
import type { useSortState } from "@/hooks/useSortState";
import { buildCacheTag } from "@/lib/filters/schema";
import { FILTER_DEFAULTS } from "@/lib/filters/constants";
import {
  saveDefaultFilters,
  clearDefaultFilters,
} from "@/utils/filter-storage";
import { isValidSortKey, isValidSortDirection } from "@/utils/type-guards";

/**
 * 필터 액션(변경, 적용, 초기화)을 관리하는 커스텀 훅
 */
/**
 * Boolean 필터 값을 URL 파라미터에 설정하는 헬퍼
 * true일 때만 URL에 설정, false일 때는 URL에서 제거
 */
async function setBooleanFilter(
  value: boolean | null | undefined,
  setter: (value: boolean | null) => Promise<URLSearchParams>
): Promise<void> {
  await setter(value === true ? true : null);
}

export function useFilterActions(
  filterState: ReturnType<typeof useFilterState>,
  sortState?: ReturnType<typeof useSortState>
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // debounce로 localStorage에 필터 저장 (500ms)
  // 컴포넌트가 언마운트된 경우 저장하지 않음
  // 정렬 상태도 함께 저장
  const debouncedSaveFilters = useCallback(
    (filters: FilterState) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        // 컴포넌트가 언마운트된 경우 저장하지 않음
        if (!isMountedRef.current) {
          return;
        }
        try {
          // 정렬 상태는 sortState 훅에서 가져오거나 URL에서 읽어서 함께 저장
          if (sortState?.sort) {
            saveDefaultFilters(filters, sortState.sort);
          } else {
            // sortState가 없으면 URL에서 읽기 (SSR 호환)
            const sortKey = searchParams.get("sortKey");
            const sortDirection = searchParams.get("sortDirection");

            if (sortKey && sortDirection) {
              if (
                isValidSortKey(sortKey) &&
                isValidSortDirection(sortDirection)
              ) {
                saveDefaultFilters(filters, {
                  key: sortKey,
                  direction: sortDirection,
                });
              } else {
                saveDefaultFilters(filters);
              }
            } else {
              saveDefaultFilters(filters);
            }
          }
        } catch (error) {
          console.error("필터 저장 실패:", error);
        }
      }, 500);
    },
    [sortState, searchParams]
  );

  // cleanup: 컴포넌트 언마운트 시 타이머 정리 및 마운트 상태 업데이트
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  // 필터 변경 시 캐시 무효화 후 리패치
  const handleFilterChange = async (
    newOrdered: boolean,
    newGoldenCross: boolean,
    newJustTurned: boolean,
    newLookbackDays: number,
    newProfitability: "all" | "profitable" | "unprofitable",
    newTurnAround: boolean,
    newRevenueGrowth: boolean,
    newIncomeGrowth: boolean,
    newRevenueGrowthQuarters?: number,
    newIncomeGrowthQuarters?: number,
    newRevenueGrowthRate?: number | null,
    newIncomeGrowthRate?: number | null,
    newPegFilter?: boolean,
    newMa20Above?: boolean,
    newMa50Above?: boolean,
    newMa100Above?: boolean,
    newMa200Above?: boolean,
    newBreakoutStrategy?: "confirmed" | "retest" | null,
    newVolumeFilter?: boolean,
    newVcpFilter?: boolean,
    newBodyFilter?: boolean,
    newMaConvergenceFilter?: boolean
  ) => {
    // 정배열 필터가 비활성화되면 "최근 전환" 옵션도 비활성화
    const finalJustTurned = newOrdered ? newJustTurned : false;

    // 이전 캐시 무효화 (모든 필터 포함)
    const oldTag = buildCacheTag({
      ordered: filterState.ordered ?? true,
      goldenCross: filterState.goldenCross ?? true,
      justTurned: filterState.justTurned ?? false,
      lookbackDays: filterState.lookbackDays ?? 10,
      profitability: filterState.profitability ?? "all",
      turnAround: filterState.turnAround ?? false,
      revenueGrowth: filterState.revenueGrowth ?? false,
      incomeGrowth: filterState.incomeGrowth ?? false,
      revenueGrowthQuarters: filterState.revenueGrowthQuarters ?? 3,
      incomeGrowthQuarters: filterState.incomeGrowthQuarters ?? 3,
      revenueGrowthRate:
        filterState.revenueGrowthRate === undefined
          ? null
          : filterState.revenueGrowthRate,
      incomeGrowthRate:
        filterState.incomeGrowthRate === undefined
          ? null
          : filterState.incomeGrowthRate,
      pegFilter: filterState.pegFilter ?? false,
      ma20Above: filterState.ma20Above ?? false,
      ma50Above: filterState.ma50Above ?? false,
      ma100Above: filterState.ma100Above ?? false,
      ma200Above: filterState.ma200Above ?? false,
      breakoutStrategy: filterState.breakoutStrategy ?? null,
      volumeFilter: filterState.volumeFilter ?? false,
      vcpFilter: filterState.vcpFilter ?? false,
      bodyFilter: filterState.bodyFilter ?? false,
      maConvergenceFilter: filterState.maConvergenceFilter ?? false,
    });
    await fetch("/api/cache/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: oldTag }),
    });

    // 이전 상태 저장 (에러 시 롤백용)
    const previousState = {
      ordered: filterState.ordered,
      goldenCross: filterState.goldenCross,
      justTurned: filterState.justTurned,
      lookbackDays: filterState.lookbackDays,
      profitability: filterState.profitability,
      turnAround: filterState.turnAround,
      revenueGrowth: filterState.revenueGrowth,
      incomeGrowth: filterState.incomeGrowth,
      revenueGrowthQuarters: filterState.revenueGrowthQuarters,
      incomeGrowthQuarters: filterState.incomeGrowthQuarters,
      revenueGrowthRate: filterState.revenueGrowthRate,
      incomeGrowthRate: filterState.incomeGrowthRate,
      pegFilter: filterState.pegFilter,
      ma20Above: filterState.ma20Above,
      ma50Above: filterState.ma50Above,
      ma100Above: filterState.ma100Above,
      ma200Above: filterState.ma200Above,
      breakoutStrategy: filterState.breakoutStrategy,
      volumeFilter: filterState.volumeFilter,
      vcpFilter: filterState.vcpFilter,
      bodyFilter: filterState.bodyFilter,
      maConvergenceFilter: filterState.maConvergenceFilter,
    };

    try {
      // URL 업데이트
      // ordered는 기본값이 true이므로, false일 때도 URL에 명시적으로 설정하여 middleware가 다시 추가하지 않도록 함
      if (newOrdered === false) {
        await filterState.setOrdered(false);
      } else {
        await setBooleanFilter(newOrdered, filterState.setOrdered);
      }
      // goldenCross는 기본값이 true이므로, false일 때도 URL에 명시적으로 유지
      await filterState.setGoldenCross(newGoldenCross);
      await setBooleanFilter(finalJustTurned, filterState.setJustTurned);

      // lookbackDays는 justTurned가 true일 때만 URL에 설정
      if (finalJustTurned && newLookbackDays !== undefined) {
        await filterState.setLookbackDays(newLookbackDays);
      } else {
        await filterState.setLookbackDays(null);
      }

      await filterState.setProfitability(newProfitability);
      await setBooleanFilter(newTurnAround, filterState.setTurnAround);
      await setBooleanFilter(newRevenueGrowth, filterState.setRevenueGrowth);
      await setBooleanFilter(newIncomeGrowth, filterState.setIncomeGrowth);

      if (newRevenueGrowthQuarters !== undefined) {
        await filterState.setRevenueGrowthQuarters(newRevenueGrowthQuarters);
      }
      if (newIncomeGrowthQuarters !== undefined) {
        await filterState.setIncomeGrowthQuarters(newIncomeGrowthQuarters);
      }
      if (newRevenueGrowthRate !== undefined) {
        await filterState.setRevenueGrowthRate(newRevenueGrowthRate);
      }
      if (newIncomeGrowthRate !== undefined) {
        await filterState.setIncomeGrowthRate(newIncomeGrowthRate);
      }
      await setBooleanFilter(newPegFilter, filterState.setPegFilter);

      // 이평선 위 필터는 true일 때만 URL에 설정, false일 때는 URL에서 제거
      await setBooleanFilter(newMa20Above, filterState.setMa20Above);
      await setBooleanFilter(newMa50Above, filterState.setMa50Above);
      await setBooleanFilter(newMa100Above, filterState.setMa100Above);
      await setBooleanFilter(newMa200Above, filterState.setMa200Above);

      // 돌파매매 전략 필터
      if (newBreakoutStrategy !== undefined) {
        await filterState.setBreakoutStrategy(
          newBreakoutStrategy === null ? null : newBreakoutStrategy
        );
      }

      // 노이즈 필터
      if (newVolumeFilter !== undefined) {
        await setBooleanFilter(newVolumeFilter, filterState.setVolumeFilter);
      }
      if (newVcpFilter !== undefined) {
        await setBooleanFilter(newVcpFilter, filterState.setVcpFilter);
      }
      if (newBodyFilter !== undefined) {
        await setBooleanFilter(newBodyFilter, filterState.setBodyFilter);
      }
      if (newMaConvergenceFilter !== undefined) {
        await setBooleanFilter(
          newMaConvergenceFilter,
          filterState.setMaConvergenceFilter
        );
      }

      // 모든 URL 업데이트 완료 후 localStorage에 필터 저장 (debounce 적용)
      debouncedSaveFilters({
        ordered: newOrdered,
        goldenCross: newGoldenCross,
        justTurned: finalJustTurned,
        lookbackDays: newLookbackDays,
        profitability: newProfitability,
        turnAround: newTurnAround,
        revenueGrowth: newRevenueGrowth,
        incomeGrowth: newIncomeGrowth,
        revenueGrowthQuarters:
          newRevenueGrowthQuarters ?? FILTER_DEFAULTS.REVENUE_GROWTH_QUARTERS,
        incomeGrowthQuarters:
          newIncomeGrowthQuarters ?? FILTER_DEFAULTS.INCOME_GROWTH_QUARTERS,
        revenueGrowthRate: newRevenueGrowthRate ?? null,
        incomeGrowthRate: newIncomeGrowthRate ?? null,
        pegFilter: newPegFilter ?? false,
        ma20Above: newMa20Above ?? false,
        ma50Above: newMa50Above ?? false,
        ma100Above: newMa100Above ?? false,
        ma200Above: newMa200Above ?? false,
        breakoutStrategy: newBreakoutStrategy ?? null,
        volumeFilter: newVolumeFilter ?? false,
        vcpFilter: newVcpFilter ?? false,
        bodyFilter: newBodyFilter ?? false,
        maConvergenceFilter: newMaConvergenceFilter ?? false,
      });

      // 서버 컴포넌트 리패치 (transition으로 감싸서 로딩 표시)
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      // 에러 발생 시 상태 롤백
      console.error("필터 적용 실패:", error);

      // pending 중인 localStorage 저장 취소 (잘못된 상태 저장 방지)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      try {
        await setBooleanFilter(previousState.ordered, filterState.setOrdered);
        // goldenCross는 기본값이 true이므로, 롤백 시에도 직접 설정
        await filterState.setGoldenCross(previousState.goldenCross);
        await setBooleanFilter(
          previousState.justTurned,
          filterState.setJustTurned
        );
        if (
          previousState.lookbackDays !== null &&
          previousState.lookbackDays !== undefined
        ) {
          await filterState.setLookbackDays(previousState.lookbackDays);
        } else {
          await filterState.setLookbackDays(null);
        }
        await filterState.setProfitability(previousState.profitability);
        await setBooleanFilter(
          previousState.turnAround,
          filterState.setTurnAround
        );
        await setBooleanFilter(
          previousState.revenueGrowth,
          filterState.setRevenueGrowth
        );
        await setBooleanFilter(
          previousState.incomeGrowth,
          filterState.setIncomeGrowth
        );
        if (previousState.revenueGrowthQuarters !== undefined) {
          await filterState.setRevenueGrowthQuarters(
            previousState.revenueGrowthQuarters
          );
        } else {
          await filterState.setRevenueGrowthQuarters(null);
        }
        if (previousState.incomeGrowthQuarters !== undefined) {
          await filterState.setIncomeGrowthQuarters(
            previousState.incomeGrowthQuarters
          );
        } else {
          await filterState.setIncomeGrowthQuarters(null);
        }
        if (previousState.revenueGrowthRate !== undefined) {
          await filterState.setRevenueGrowthRate(
            previousState.revenueGrowthRate
          );
        } else {
          await filterState.setRevenueGrowthRate(null);
        }
        if (previousState.incomeGrowthRate !== undefined) {
          await filterState.setIncomeGrowthRate(previousState.incomeGrowthRate);
        } else {
          await filterState.setIncomeGrowthRate(null);
        }
        await setBooleanFilter(
          previousState.pegFilter,
          filterState.setPegFilter
        );
        await setBooleanFilter(
          previousState.ma20Above,
          filterState.setMa20Above
        );
        await setBooleanFilter(
          previousState.ma50Above,
          filterState.setMa50Above
        );
        await setBooleanFilter(
          previousState.ma100Above,
          filterState.setMa100Above
        );
        await setBooleanFilter(
          previousState.ma200Above,
          filterState.setMa200Above
        );
        await filterState.setBreakoutStrategy(previousState.breakoutStrategy);
        await setBooleanFilter(
          previousState.volumeFilter,
          filterState.setVolumeFilter
        );
        await setBooleanFilter(
          previousState.vcpFilter,
          filterState.setVcpFilter
        );
        await setBooleanFilter(
          previousState.bodyFilter,
          filterState.setBodyFilter
        );
        await setBooleanFilter(
          previousState.maConvergenceFilter,
          filterState.setMaConvergenceFilter
        );
      } catch (rollbackError) {
        console.error("롤백 실패:", rollbackError);
      }
      // 에러를 다시 throw하여 상위에서 처리할 수 있도록 함
      throw error;
    }
  };

  // 필터 팝업에서 적용 버튼 클릭 시 (카테고리별 부분 업데이트)
  const handleFilterApply = (newState: Partial<FilterState>) => {
    handleFilterChange(
      Object.prototype.hasOwnProperty.call(newState, "ordered")
        ? (newState.ordered ?? false)
        : (filterState.ordered ?? false),
      Object.prototype.hasOwnProperty.call(newState, "goldenCross")
        ? (newState.goldenCross ?? false)
        : (filterState.goldenCross ?? false),
      Object.prototype.hasOwnProperty.call(newState, "justTurned")
        ? (newState.justTurned ?? false)
        : (filterState.justTurned ?? false),
      newState.lookbackDays ??
        filterState.lookbackDays ??
        FILTER_DEFAULTS.LOOKBACK_DAYS,
      newState.profitability ?? filterState.profitability,
      newState.turnAround ?? filterState.turnAround ?? false,
      newState.revenueGrowth ?? filterState.revenueGrowth ?? false,
      newState.incomeGrowth ?? filterState.incomeGrowth ?? false,
      newState.revenueGrowthQuarters ?? filterState.revenueGrowthQuarters,
      newState.incomeGrowthQuarters ?? filterState.incomeGrowthQuarters,
      Object.prototype.hasOwnProperty.call(newState, "revenueGrowthRate")
        ? (newState.revenueGrowthRate ?? null)
        : (filterState.revenueGrowthRate ?? null),
      Object.prototype.hasOwnProperty.call(newState, "incomeGrowthRate")
        ? (newState.incomeGrowthRate ?? null)
        : (filterState.incomeGrowthRate ?? null),
      Object.prototype.hasOwnProperty.call(newState, "pegFilter")
        ? (newState.pegFilter ?? false)
        : (filterState.pegFilter ?? false),
      Object.prototype.hasOwnProperty.call(newState, "ma20Above")
        ? (newState.ma20Above ?? false)
        : (filterState.ma20Above ?? false),
      Object.prototype.hasOwnProperty.call(newState, "ma50Above")
        ? (newState.ma50Above ?? false)
        : (filterState.ma50Above ?? false),
      Object.prototype.hasOwnProperty.call(newState, "ma100Above")
        ? (newState.ma100Above ?? false)
        : (filterState.ma100Above ?? false),
      Object.prototype.hasOwnProperty.call(newState, "ma200Above")
        ? (newState.ma200Above ?? false)
        : (filterState.ma200Above ?? false),
      Object.prototype.hasOwnProperty.call(newState, "breakoutStrategy")
        ? (newState.breakoutStrategy ?? null)
        : (filterState.breakoutStrategy ?? null),
      Object.prototype.hasOwnProperty.call(newState, "volumeFilter")
        ? (newState.volumeFilter ?? false)
        : (filterState.volumeFilter ?? false),
      Object.prototype.hasOwnProperty.call(newState, "vcpFilter")
        ? (newState.vcpFilter ?? false)
        : (filterState.vcpFilter ?? false),
      Object.prototype.hasOwnProperty.call(newState, "bodyFilter")
        ? (newState.bodyFilter ?? false)
        : (filterState.bodyFilter ?? false),
      Object.prototype.hasOwnProperty.call(newState, "maConvergenceFilter")
        ? (newState.maConvergenceFilter ?? false)
        : (filterState.maConvergenceFilter ?? false)
    );
  };

  // 필터 초기화 (카테고리별)
  const handleFilterReset = (category: FilterCategory) => {
    // 필터 초기화 시 localStorage도 초기화
    clearDefaultFilters();

    if (category === "ma") {
      // 이평선 필터 초기화: URL 파라미터에서 제거
      handleFilterChange(
        false, // ordered 초기화 (URL에서 제거)
        false, // goldenCross 초기화 (URL에서 제거)
        false, // justTurned 초기화 (URL에서 제거)
        FILTER_DEFAULTS.LOOKBACK_DAYS, // lookbackDays (기본값이지만 URL에서 제거됨)
        filterState.profitability,
        filterState.turnAround ?? false,
        filterState.revenueGrowth,
        filterState.incomeGrowth,
        filterState.revenueGrowthQuarters,
        filterState.incomeGrowthQuarters,
        filterState.revenueGrowthRate,
        filterState.incomeGrowthRate,
        filterState.pegFilter,
        false, // ma20Above 초기화
        false, // ma50Above 초기화
        false, // ma100Above 초기화
        false, // ma200Above 초기화
        filterState.breakoutStrategy ?? null, // breakoutStrategy 유지
        filterState.volumeFilter ?? false,
        filterState.vcpFilter ?? false,
        filterState.bodyFilter ?? false,
        filterState.maConvergenceFilter ?? false
      );
    } else if (category === "growth") {
      handleFilterChange(
        filterState.ordered ?? false,
        filterState.goldenCross ?? false,
        filterState.justTurned ?? false,
        filterState.lookbackDays ?? FILTER_DEFAULTS.LOOKBACK_DAYS,
        filterState.profitability,
        filterState.turnAround ?? false,
        false, // revenueGrowth
        false, // incomeGrowth
        FILTER_DEFAULTS.REVENUE_GROWTH_QUARTERS, // revenueGrowthQuarters
        FILTER_DEFAULTS.INCOME_GROWTH_QUARTERS, // incomeGrowthQuarters
        null, // revenueGrowthRate
        null, // incomeGrowthRate
        false, // pegFilter
        filterState.ma20Above ?? false,
        filterState.ma50Above ?? false,
        filterState.ma100Above ?? false,
        filterState.ma200Above ?? false,
        filterState.breakoutStrategy ?? null,
        filterState.volumeFilter ?? false,
        filterState.vcpFilter ?? false,
        filterState.bodyFilter ?? false,
        filterState.maConvergenceFilter ?? false
      );
    } else if (category === "profitability") {
      handleFilterChange(
        filterState.ordered ?? false,
        filterState.goldenCross ?? false,
        filterState.justTurned ?? false,
        filterState.lookbackDays ?? FILTER_DEFAULTS.LOOKBACK_DAYS,
        "all", // profitability
        false, // turnAround
        filterState.revenueGrowth ?? false,
        filterState.incomeGrowth ?? false,
        filterState.revenueGrowthQuarters ??
          FILTER_DEFAULTS.REVENUE_GROWTH_QUARTERS,
        filterState.incomeGrowthQuarters ??
          FILTER_DEFAULTS.INCOME_GROWTH_QUARTERS,
        filterState.revenueGrowthRate ?? null,
        filterState.incomeGrowthRate ?? null,
        filterState.pegFilter ?? false,
        filterState.ma20Above ?? false,
        filterState.ma50Above ?? false,
        filterState.ma100Above ?? false,
        filterState.ma200Above ?? false,
        filterState.breakoutStrategy ?? null,
        filterState.volumeFilter ?? false,
        filterState.vcpFilter ?? false,
        filterState.bodyFilter ?? false,
        filterState.maConvergenceFilter ?? false
      );
    } else if (category === "price") {
      handleFilterChange(
        filterState.ordered ?? false,
        filterState.goldenCross ?? false,
        filterState.justTurned ?? false,
        filterState.lookbackDays ?? FILTER_DEFAULTS.LOOKBACK_DAYS,
        filterState.profitability,
        filterState.turnAround ?? false,
        filterState.revenueGrowth ?? false,
        filterState.incomeGrowth ?? false,
        filterState.revenueGrowthQuarters ??
          FILTER_DEFAULTS.REVENUE_GROWTH_QUARTERS,
        filterState.incomeGrowthQuarters ??
          FILTER_DEFAULTS.INCOME_GROWTH_QUARTERS,
        filterState.revenueGrowthRate ?? null,
        filterState.incomeGrowthRate ?? null,
        filterState.pegFilter ?? false,
        filterState.ma20Above ?? false,
        filterState.ma50Above ?? false,
        filterState.ma100Above ?? false,
        filterState.ma200Above ?? false,
        null, // breakoutStrategy 초기화
        filterState.volumeFilter ?? false,
        filterState.vcpFilter ?? false,
        filterState.bodyFilter ?? false,
        filterState.maConvergenceFilter ?? false
      );
    } else if (category === "noise") {
      handleFilterChange(
        filterState.ordered ?? false,
        filterState.goldenCross ?? false,
        filterState.justTurned ?? false,
        filterState.lookbackDays ?? FILTER_DEFAULTS.LOOKBACK_DAYS,
        filterState.profitability,
        filterState.turnAround ?? false,
        filterState.revenueGrowth ?? false,
        filterState.incomeGrowth ?? false,
        filterState.revenueGrowthQuarters ??
          FILTER_DEFAULTS.REVENUE_GROWTH_QUARTERS,
        filterState.incomeGrowthQuarters ??
          FILTER_DEFAULTS.INCOME_GROWTH_QUARTERS,
        filterState.revenueGrowthRate ?? null,
        filterState.incomeGrowthRate ?? null,
        filterState.pegFilter ?? false,
        filterState.ma20Above ?? false,
        filterState.ma50Above ?? false,
        filterState.ma100Above ?? false,
        filterState.ma200Above ?? false,
        filterState.breakoutStrategy ?? null,
        false, // volumeFilter 초기화
        false, // vcpFilter 초기화
        false, // bodyFilter 초기화
        false // maConvergenceFilter 초기화
      );
    }
  };

  return {
    handleFilterChange,
    handleFilterApply,
    handleFilterReset,
    isPending,
  };
}
