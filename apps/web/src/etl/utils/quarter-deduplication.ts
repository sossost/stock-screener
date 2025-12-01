import { asQuarter } from "./date";

/**
 * 같은 분기(asOfQ)에 대해 가장 최신 날짜만 유지하는 함수
 *
 * @param rows 날짜를 키로 하는 Map (date -> row). 각 row는 반드시 `date: string` 속성을 가져야 함
 * @returns 분기를 키로 하는 Map (asOfQ -> latest row). 같은 분기의 여러 날짜가 있으면 가장 최신 날짜만 유지됨
 *
 * @example
 * ```typescript
 * const map = new Map<string, { date: string; revenue: number }>();
 * map.set("2025-06-28", { date: "2025-06-28", revenue: 425200000 });
 * map.set("2025-06-30", { date: "2025-06-30", revenue: 480700000 });
 *
 * const result = deduplicateByQuarter(map);
 * // result.get("2025Q2")?.date === "2025-06-30" (최신 날짜만 유지)
 * ```
 */
export function deduplicateByQuarter<T extends { date: string }>(
  rows: Map<string, T>
): Map<string, T> {
  // 빈 Map 조기 반환
  if (rows.size === 0) {
    return new Map<string, T>();
  }

  const quarterMap = new Map<string, T>();

  for (const [, row] of rows) {
    // date 속성 검증: null/undefined/빈 문자열 체크
    if (!row?.date || typeof row.date !== "string" || row.date.trim() === "") {
      continue;
    }

    // asQuarter는 항상 성공하므로 try-catch 불필요
    // (date.slice는 빈 문자열이어도 에러를 던지지 않음)
    const asQ = asQuarter(row.date);
    const existing = quarterMap.get(asQ);

    // 기존 데이터가 없거나, 현재 날짜가 더 최신이면 업데이트
    if (!existing || row.date > existing.date) {
      quarterMap.set(asQ, row);
    }
  }

  return quarterMap;
}
