import type { FilterState } from "@/lib/filters/summary";
import { filterDefaults } from "@/lib/filters/schema";

const STORAGE_KEY = "screener_default_filters";

/**
 * 필터 상태를 localStorage에 저장
 * @param filterState 저장할 필터 상태
 */
export function saveDefaultFilters(filterState: FilterState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const json = JSON.stringify(filterState);
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

    const parsed = JSON.parse(stored) as Partial<FilterState>;
    return parsed;
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

