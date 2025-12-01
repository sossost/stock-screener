import { asQuarter } from "./date";

/**
 * 같은 분기(asOfQ)에 대해 가장 최신 날짜만 유지하는 함수
 * @param rows 날짜를 키로 하는 Map (date -> row)
 * @returns 분기를 키로 하는 Map (asOfQ -> latest row)
 */
export function deduplicateByQuarter<T extends { date: string }>(
  rows: Map<string, T>
): Map<string, T> {
  const quarterMap = new Map<string, T>();
  
  for (const [, row] of rows) {
    const asQ = asQuarter(row.date);
    const existing = quarterMap.get(asQ);
    if (!existing || row.date > existing.date) {
      quarterMap.set(asQ, row);
    }
  }
  
  return quarterMap;
}

