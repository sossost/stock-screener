import {
  useState,
  useEffect,
  useMemo,
  useDeferredValue,
  useTransition,
} from "react";
import { filterTickerData } from "@/lib/filters/ticker";
import type { ScreenerCompany } from "@/types/screener";

/**
 * 티커 검색 로직을 관리하는 커스텀 훅
 * debounce와 useDeferredValue를 사용하여 성능 최적화
 */
export function useTickerSearch(data: ScreenerCompany[]) {
  const [, startTransition] = useTransition();

  // 티커 검색 필터 (입력값과 실제 검색값 분리)
  const [tickerSearchInput, setTickerSearchInput] = useState<string>("");
  const [tickerSearch, setTickerSearch] = useState<string>("");

  // Debounce: 입력값이 변경된 후 300ms 후에 실제 검색값 업데이트
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setTickerSearch(tickerSearchInput.trim());
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [tickerSearchInput, startTransition]);

  // useDeferredValue로 검색 입력 최적화 (필터링은 우선순위 낮춤)
  const deferredTickerSearch = useDeferredValue(tickerSearch);

  // 티커 검색으로 필터링된 데이터 (useMemo로 최적화, deferred 값 사용)
  const filteredData = useMemo(() => {
    return filterTickerData(data, deferredTickerSearch);
  }, [data, deferredTickerSearch]);

  return {
    tickerSearchInput,
    setTickerSearchInput,
    tickerSearch,
    filteredData,
    isSearching: !!tickerSearchInput || !!tickerSearch,
  };
}
