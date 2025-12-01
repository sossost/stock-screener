import { useQueryState, parseAsStringLiteral } from "nuqs";
import {
  defaultSort,
  type SortKey,
  SORT_KEY_VALUES,
} from "@/components/screener/columns";

const sortDirectionValues = ["asc", "desc"] as const;

export type SortDirection = "asc" | "desc";

export type SortState = {
  key: SortKey;
  direction: SortDirection;
};

/**
 * 정렬 상태 관리 커스텀 훅
 * 정렬 상태를 URL 쿼리 파라미터로 관리
 */
export function useSortState() {
  const [sortKey, setSortKey] = useQueryState(
    "sortKey",
    parseAsStringLiteral(SORT_KEY_VALUES).withDefault(defaultSort.key)
  );

  const [sortDirection, setSortDirection] = useQueryState(
    "sortDirection",
    parseAsStringLiteral(sortDirectionValues).withDefault(defaultSort.direction)
  );

  const sort: SortState = {
    key: sortKey ?? defaultSort.key,
    direction: sortDirection ?? defaultSort.direction,
  };

  const setSort = async (newSort: SortState) => {
    await Promise.all([
      setSortKey(newSort.key),
      setSortDirection(newSort.direction),
    ]);
  };

  return {
    sort,
    setSort,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
  };
}
