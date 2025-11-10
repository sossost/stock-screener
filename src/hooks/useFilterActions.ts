import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { FilterState, FilterCategory } from "@/lib/filter-summary";
import { useFilterState } from "@/hooks/useFilterState";

/**
 * 필터 액션(변경, 적용, 초기화)을 관리하는 커스텀 훅
 */
export function useFilterActions(filterState: ReturnType<typeof useFilterState>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 필터 변경 시 캐시 무효화 후 리패치
  const handleFilterChange = async (
    newOrdered: boolean,
    newGoldenCross: boolean,
    newJustTurned: boolean,
    newLookbackDays: number,
    newProfitability: "all" | "profitable" | "unprofitable",
    newRevenueGrowth: boolean,
    newIncomeGrowth: boolean,
    newRevenueGrowthQuarters?: number,
    newIncomeGrowthQuarters?: number,
    newRevenueGrowthRate?: number | null,
    newIncomeGrowthRate?: number | null,
    newPegFilter?: boolean
  ) => {
    // 정배열 필터가 비활성화되면 "최근 전환" 옵션도 비활성화
    const finalJustTurned = newOrdered ? newJustTurned : false;

    // 이전 캐시 무효화 (모든 필터 포함)
    const oldTag = `golden-cross-${filterState.ordered}-${filterState.goldenCross}-${filterState.justTurned}-${filterState.lookbackDays}-${filterState.profitability}-${filterState.revenueGrowth}-${filterState.revenueGrowthQuarters}-${
      filterState.revenueGrowthRate ?? ""
    }-${filterState.incomeGrowth}-${filterState.incomeGrowthQuarters}-${
      filterState.incomeGrowthRate ?? ""
    }-${filterState.pegFilter}`;
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
        : filterState.pegFilter
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
        filterState.revenueGrowth,
        filterState.incomeGrowth,
        filterState.revenueGrowthQuarters,
        filterState.incomeGrowthQuarters,
        filterState.revenueGrowthRate,
        filterState.incomeGrowthRate,
        filterState.pegFilter
      );
    } else if (category === "growth") {
      handleFilterChange(
        filterState.ordered,
        filterState.goldenCross,
        filterState.justTurned,
        filterState.lookbackDays,
        filterState.profitability,
        false, // revenueGrowth
        false, // incomeGrowth
        3, // revenueGrowthQuarters
        3, // incomeGrowthQuarters
        null, // revenueGrowthRate
        null, // incomeGrowthRate
        false // pegFilter
      );
    } else if (category === "profitability") {
      handleFilterChange(
        filterState.ordered,
        filterState.goldenCross,
        filterState.justTurned,
        filterState.lookbackDays,
        "all", // profitability
        filterState.revenueGrowth,
        filterState.incomeGrowth,
        filterState.revenueGrowthQuarters,
        filterState.incomeGrowthQuarters,
        filterState.revenueGrowthRate,
        filterState.incomeGrowthRate,
        filterState.pegFilter
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

