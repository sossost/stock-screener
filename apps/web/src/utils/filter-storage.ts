import type { FilterState } from "@/lib/filters/summary";
import { filterDefaults } from "@/lib/filters/schema";
import type { SortState } from "@/hooks/useSortState";

const STORAGE_KEY = "screener_default_filters";

/**
 * 필터 상태와 정렬 상태를 함께 저장하는 타입
 */
export type SavedFilterState = Partial<FilterState> & {
  sortState?: SortState;
};

/**
 * 필터 상태를 localStorage에 저장 (정렬 상태도 함께 저장)
 * @param filterState 저장할 필터 상태 (Partial도 허용)
 * @param sortState 저장할 정렬 상태 (선택적)
 */
export function saveDefaultFilters(
  filterState: FilterState | Partial<FilterState>,
  sortState?: SortState
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const savedState: SavedFilterState = {
      ...filterState,
      ...(sortState && { sortState }),
    };

    const json = JSON.stringify(savedState);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    // localStorage 접근 실패 시 에러 로그만 출력 (사용자 경험 방해하지 않음)
    console.error("Failed to save filters to localStorage:", error);
  }
}

/**
 * localStorage에서 기본 필터 설정 읽기
 * @returns 저장된 필터 상태 또는 null
 */
export function loadDefaultFilters(): Partial<FilterState> | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as SavedFilterState;
    // sortState는 필터 상태가 아니므로 제외
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sortState, ...filterState } = parsed;
    return filterState;
  } catch (error) {
    // JSON 파싱 실패 시 localStorage 값 삭제하고 null 반환
    console.error("Failed to parse filters from localStorage:", error);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (removeError) {
      console.error("Failed to remove invalid filter data:", removeError);
    }
    return null;
  }
}

/**
 * localStorage에서 정렬 상태 읽기 (필터 저장 시 함께 저장된 정렬 상태)
 * @returns 저장된 정렬 상태 또는 null
 */
export function loadSavedSortState(): SortState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as SavedFilterState;
    return parsed.sortState ?? null;
  } catch (error) {
    console.error("Failed to parse sort state from localStorage:", error);
    return null;
  }
}

/**
 * localStorage에서 기본 필터 설정 삭제
 */
export function clearDefaultFilters(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear filters from localStorage:", error);
  }
}

/**
 * localStorage 기본 필터와 URL 필터를 병합
 * URL 파라미터가 우선순위를 가짐
 * @param defaultFilters localStorage에서 읽은 기본 필터
 * @param urlFilters URL 쿼리 파라미터에서 읽은 필터
 * @returns 병합된 완전한 FilterState
 */
export function mergeFilters(
  defaultFilters: Partial<FilterState> | null,
  urlFilters: Partial<FilterState>
): FilterState {
  // localStorage 기본값과 filterDefaults 병합
  const mergedDefaults = {
    ...filterDefaults,
    ...defaultFilters,
  };

  // URL 필터가 우선 (URL 파라미터가 있으면 덮어씀)
  const merged: FilterState = {
    ...mergedDefaults,
    ...urlFilters,
  };

  return merged;
}
