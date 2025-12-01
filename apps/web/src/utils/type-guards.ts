import type { SortKey } from "@/components/screener/columns";
import { SORT_KEY_VALUES } from "@/components/screener/columns";

/**
 * 문자열이 유효한 SortKey인지 확인하는 타입 가드
 */
export function isValidSortKey(key: string): key is SortKey {
  return SORT_KEY_VALUES.includes(key as SortKey);
}

/**
 * 문자열이 유효한 정렬 방향인지 확인하는 타입 가드
 */
export function isValidSortDirection(
  dir: string
): dir is "asc" | "desc" {
  return dir === "asc" || dir === "desc";
}

