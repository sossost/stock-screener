/**
 * 티커(심볼) 필터링 유틸리티 함수
 * 대소문자 구분 없이 부분 일치 검색
 */

/**
 * 검색어로 심볼을 필터링
 * @param symbols - 필터링할 심볼 배열
 * @param searchQuery - 검색어 (대소문자 구분 없음)
 * @returns 필터링된 심볼 배열
 */
export function filterTickers(
  symbols: string[],
  searchQuery: string
): string[] {
  if (!searchQuery || searchQuery.trim() === "") {
    return symbols;
  }

  const normalizedQuery = searchQuery.trim().toUpperCase();

  return symbols.filter((symbol) =>
    symbol.toUpperCase().includes(normalizedQuery)
  );
}

/**
 * 종목 데이터 배열을 검색어로 필터링
 * @param data - 필터링할 종목 데이터 배열
 * @param searchQuery - 검색어
 * @returns 필터링된 종목 데이터 배열
 */
export function filterTickerData<T extends { symbol: string }>(
  data: T[],
  searchQuery: string
): T[] {
  if (!searchQuery || searchQuery.trim() === "") {
    return data;
  }

  const normalizedQuery = searchQuery.trim().toUpperCase();

  return data.filter((item) =>
    item.symbol.toUpperCase().includes(normalizedQuery)
  );
}
