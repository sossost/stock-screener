import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { FilterState, FilterCategory } from "@/lib/filters/summary";
import { useFilterState } from "@/hooks/useFilterState";
import { buildCacheTag } from "@/lib/filters/schema";

/**
 * 필터 액션(변경, 적용, 초기화)을 관리하는 커스텀 훅
 */
export function useFilterActions(
  filterState: ReturnType<typeof useFilterState>
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
    newMa200Above?: boolean
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
    });
    await fetch("/api/cache/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: oldTag }),
    });

    // URL 업데이트
    await filterState.setOrdered(newOrdered);
    await filterState.setGoldenCross(newGoldenCross);
    await filterState.setJustTurned(finalJustTurned);
    await filterState.setLookbackDays(newLookbackDays);
    await filterState.setProfitability(newProfitability);
    await filterState.setTurnAround(newTurnAround);
    await filterState.setRevenueGrowth(newRevenueGrowth);
    await filterState.setIncomeGrowth(newIncomeGrowth);

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
    if (newPegFilter !== undefined) {
      await filterState.setPegFilter(newPegFilter);
    }
    if (newMa20Above !== undefined) {
      await filterState.setMa20Above(newMa20Above);
    }
    if (newMa50Above !== undefined) {
      await filterState.setMa50Above(newMa50Above);
    }
    if (newMa100Above !== undefined) {
      await filterState.setMa100Above(newMa100Above);
    }
    if (newMa200Above !== undefined) {
      await filterState.setMa200Above(newMa200Above);
    }

    // 서버 컴포넌트 리패치 (transition으로 감싸서 로딩 표시)
    startTransition(() => {
      router.refresh();
    });
  };

  // 필터 팝업에서 적용 버튼 클릭 시 (카테고리별 부분 업데이트)
  const handleFilterApply = (newState: Partial<FilterState>) => {
    handleFilterChange(
      newState.ordered ?? filterState.ordered,
      newState.goldenCross ?? filterState.goldenCross,
      newState.justTurned ?? filterState.justTurned,
      newState.lookbackDays ?? filterState.lookbackDays,
      newState.profitability ?? filterState.profitability,
      newState.turnAround ?? filterState.turnAround ?? false,
      newState.revenueGrowth ?? filterState.revenueGrowth,
      newState.incomeGrowth ?? filterState.incomeGrowth,
      newState.revenueGrowthQuarters ?? filterState.revenueGrowthQuarters,
      newState.incomeGrowthQuarters ?? filterState.incomeGrowthQuarters,
      Object.prototype.hasOwnProperty.call(newState, "revenueGrowthRate")
        ? newState.revenueGrowthRate ?? null
        : filterState.revenueGrowthRate ?? null,
      Object.prototype.hasOwnProperty.call(newState, "incomeGrowthRate")
        ? newState.incomeGrowthRate ?? null
        : filterState.incomeGrowthRate ?? null,
      Object.prototype.hasOwnProperty.call(newState, "pegFilter")
        ? newState.pegFilter ?? false
        : filterState.pegFilter,
      Object.prototype.hasOwnProperty.call(newState, "ma20Above")
        ? newState.ma20Above ?? false
        : filterState.ma20Above,
      Object.prototype.hasOwnProperty.call(newState, "ma50Above")
        ? newState.ma50Above ?? false
        : filterState.ma50Above,
      Object.prototype.hasOwnProperty.call(newState, "ma100Above")
        ? newState.ma100Above ?? false
        : filterState.ma100Above,
      Object.prototype.hasOwnProperty.call(newState, "ma200Above")
        ? newState.ma200Above ?? false
        : filterState.ma200Above
    );
  };

  // 필터 초기화 (카테고리별)
  const handleFilterReset = (category: FilterCategory) => {
    if (category === "ma") {
      handleFilterChange(
        true, // ordered
        true, // goldenCross
        false, // justTurned
        10, // lookbackDays
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
        false // ma200Above 초기화
      );
    } else if (category === "growth") {
      handleFilterChange(
        filterState.ordered,
        filterState.goldenCross,
        filterState.justTurned,
        filterState.lookbackDays,
        filterState.profitability,
        filterState.turnAround ?? false,
        false, // revenueGrowth
        false, // incomeGrowth
        3, // revenueGrowthQuarters
        3, // incomeGrowthQuarters
        null, // revenueGrowthRate
        null, // incomeGrowthRate
        false, // pegFilter
        filterState.ma20Above,
        filterState.ma50Above,
        filterState.ma100Above,
        filterState.ma200Above
      );
    } else if (category === "profitability") {
      handleFilterChange(
        filterState.ordered,
        filterState.goldenCross,
        filterState.justTurned,
        filterState.lookbackDays,
        "all", // profitability
        false, // turnAround
        filterState.revenueGrowth,
        filterState.incomeGrowth,
        filterState.revenueGrowthQuarters,
        filterState.incomeGrowthQuarters,
        filterState.revenueGrowthRate,
        filterState.incomeGrowthRate,
        filterState.pegFilter,
        filterState.ma20Above,
        filterState.ma50Above,
        filterState.ma100Above,
        filterState.ma200Above
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
