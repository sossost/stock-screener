import { useQueryStates, type Options } from "nuqs";
import { useCallback, useMemo } from "react";
import { filterParsers } from "@/lib/filters/schema";

/**
 * filterParsers에서 필터 타입 자동 추론
 * 새 필터 추가 시 filterParsers만 수정하면 타입도 자동 반영
 */
type InferFilters<
  T extends Record<string, { parse: (value: string) => unknown }>,
> = {
  [K in keyof T]: ReturnType<T[K]["parse"]>;
};

export type Filters = InferFilters<typeof filterParsers>;

// setter 이름 생성 헬퍼 타입
type SetterName<K extends string> = `set${Capitalize<K>}`;
type FilterSetters = {
  [K in keyof Filters as SetterName<K & string>]: (
    value: Filters[K] | null,
    options?: Options
  ) => Promise<URLSearchParams>;
};

// 필터 키 목록 (filterParsers에서 자동 추출)
const filterKeys = Object.keys(filterParsers) as (keyof typeof filterParsers)[];

/**
 * 필터 상태 관리 커스텀 훅 (스키마 기반)
 *
 * 단일 진실 공급원(SSOT): filterParsers 스키마 하나로 관리
 * - URL 파싱, 직렬화, 타입 추론이 모두 filterParsers에서 파생
 * - 새 필터 추가 시 filterParsers에 필드만 추가하면 자동 반영
 */
export function useFilterState() {
  const [filters, setFilters] = useQueryStates(filterParsers);

  // 개별 setter 생성 함수
  const createSetter = useCallback(
    <K extends keyof Filters>(key: K) => {
      return (value: Filters[K] | null, options?: Options) => {
        return setFilters({ [key]: value } as Partial<Filters>, options);
      };
    },
    [setFilters]
  );

  // setter 이름을 키의 첫 글자 대문자로 변환 (예: ordered -> setOrdered)
  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  // 모든 필터에 대한 setter를 동적으로 생성
  const setters = useMemo(() => {
    const result = {} as FilterSetters;
    for (const key of filterKeys) {
      const setterName = `set${capitalize(key)}` as SetterName<typeof key>;
      (result as Record<string, unknown>)[setterName] = createSetter(key);
    }
    return result;
  }, [createSetter]);

  // 기존 인터페이스와 호환되는 형태로 반환
  return {
    // 필터 값들 (filterParsers에서 자동 추론)
    ...filters,
    // 개별 setter들 (filterParsers에서 자동 생성)
    ...setters,
    // 전체 필터와 setter도 함께 제공 (고급 사용)
    filters,
    setFilters,
  };
}

// 훅 반환 타입 export
export type FilterStateReturn = ReturnType<typeof useFilterState>;
