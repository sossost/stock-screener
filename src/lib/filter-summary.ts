/**
 * 필터 요약 로직
 * 활성화된 필터를 텍스트로 요약하여 필터박스에 표시
 */

export interface FilterState {
  ordered?: boolean;
  goldenCross?: boolean;
  justTurned?: boolean;
  lookbackDays?: number;
  profitability?: "all" | "profitable" | "unprofitable";
  revenueGrowth?: boolean;
  revenueGrowthQuarters?: number;
  revenueGrowthRate?: number | null;
  incomeGrowth?: boolean;
  incomeGrowthQuarters?: number;
  incomeGrowthRate?: number | null;
  pegFilter?: boolean; // PEG < 1 필터
}

export interface FilterSummary {
  activeFilters: string[];
  count: number;
  summaryText: string;
}

export type FilterCategory = "ma" | "growth" | "profitability";

/**
 * 이평선 필터 요약
 */
export function getMAFilterSummary(filterState: FilterState): FilterSummary {
  const activeFilters: string[] = [];

  if (filterState.ordered) {
    activeFilters.push("정배열");
  }
  if (filterState.goldenCross) {
    activeFilters.push("골든크로스");
  }
  if (filterState.justTurned && filterState.ordered) {
    activeFilters.push(`최근 전환 (${filterState.lookbackDays ?? 10}일)`);
  }

  const count = activeFilters.length;
  let summaryText = "";

  if (count === 0) {
    summaryText = "이평선 필터 없음";
  } else {
    summaryText = activeFilters.join(", ");
  }

  return {
    activeFilters,
    count,
    summaryText,
  };
}

/**
 * 성장성 필터 요약
 */
export function getGrowthFilterSummary(
  filterState: FilterState
): FilterSummary {
  const activeFilters: string[] = [];

  // 매출 성장 필터
  if (filterState.revenueGrowth) {
    if (
      filterState.revenueGrowthRate !== null &&
      filterState.revenueGrowthRate !== undefined
    ) {
      activeFilters.push(
        `매출 ${filterState.revenueGrowthQuarters ?? 3}분기 연속 + 평균 ${
          filterState.revenueGrowthRate
        }%`
      );
    } else {
      activeFilters.push(
        `매출 ${filterState.revenueGrowthQuarters ?? 3}분기 연속`
      );
    }
  }

  // 수익 성장 필터
  if (filterState.incomeGrowth) {
    if (
      filterState.incomeGrowthRate !== null &&
      filterState.incomeGrowthRate !== undefined
    ) {
      activeFilters.push(
        `수익 ${filterState.incomeGrowthQuarters ?? 3}분기 연속 + 평균 ${
          filterState.incomeGrowthRate
        }%`
      );
    } else {
      activeFilters.push(
        `수익 ${filterState.incomeGrowthQuarters ?? 3}분기 연속`
      );
    }
  }

  // PEG 필터
  if (filterState.pegFilter) {
    activeFilters.push("PEG < 1");
  }

  const count = activeFilters.length;
  let summaryText = "";

  if (count === 0) {
    summaryText = "성장성 필터 없음";
  } else {
    summaryText = activeFilters.join(", ");
  }

  return {
    activeFilters,
    count,
    summaryText,
  };
}

/**
 * 수익성 필터 요약
 */
export function getProfitabilityFilterSummary(
  filterState: FilterState
): FilterSummary {
  const activeFilters: string[] = [];

  if (filterState.profitability === "profitable") {
    activeFilters.push("흑자");
  } else if (filterState.profitability === "unprofitable") {
    activeFilters.push("적자");
  }

  const count = activeFilters.length;
  let summaryText = "";

  if (count === 0) {
    summaryText = "수익성 필터 없음";
  } else {
    summaryText = activeFilters.join(", ");
  }

  return {
    activeFilters,
    count,
    summaryText,
  };
}

/**
 * 필터 상태를 요약 텍스트로 변환 (전체)
 */
export function getFilterSummary(filterState: FilterState): FilterSummary {
  const activeFilters: string[] = [];

  // 이평선 필터
  const maSummary = getMAFilterSummary(filterState);
  activeFilters.push(...maSummary.activeFilters);

  // 수익성 필터
  const profitabilitySummary = getProfitabilityFilterSummary(filterState);
  activeFilters.push(...profitabilitySummary.activeFilters);

  // 성장성 필터
  const growthSummary = getGrowthFilterSummary(filterState);
  activeFilters.push(...growthSummary.activeFilters);

  const count = activeFilters.length;
  let summaryText = "";

  if (count === 0) {
    summaryText = "필터 없음";
  } else if (count <= 3) {
    summaryText = activeFilters.join(", ");
  } else {
    summaryText = `${activeFilters.slice(0, 2).join(", ")} 외 ${count - 2}개`;
  }

  return {
    activeFilters,
    count,
    summaryText,
  };
}
