import type { SortKey } from "@/components/screener/columns";

export type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

const STORAGE_KEY = "screener_table_sort";

/**
 * 정렬 상태를 localStorage에 저장
 * @param sortState 저장할 정렬 상태
 */
export function saveSortState(sortState: SortState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const json = JSON.stringify(sortState);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    // localStorage 접근 실패 시 에러 로그만 출력 (사용자 경험 방해하지 않음)
    console.error("Failed to save sort state to localStorage:", error);
  }
}

/**
 * localStorage에서 정렬 상태 읽기
 * @returns 저장된 정렬 상태 또는 null
 */
export function loadSortState(): SortState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as SortState;
    
    // 유효성 검증
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.key === "string" &&
      (parsed.direction === "asc" || parsed.direction === "desc")
    ) {
      return parsed;
    }
    
    // 유효하지 않은 데이터는 삭제
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch (error) {
    // JSON 파싱 실패 시 localStorage 값 삭제하고 null 반환
    console.error("Failed to parse sort state from localStorage:", error);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (removeError) {
      console.error("Failed to remove invalid sort data:", removeError);
    }
    return null;
  }
}

/**
 * localStorage에서 정렬 상태 삭제
 */
export function clearSortState(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear sort state from localStorage:", error);
  }
}

