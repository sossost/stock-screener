import type { StockMAStatus } from "@/types/stock-detail";

/**
 * 이동평균선 상태 계산
 * @param ma20 20일 이동평균
 * @param ma50 50일 이동평균
 * @param ma100 100일 이동평균
 * @param ma200 200일 이동평균
 * @returns 정배열/골든크로스 상태
 */
export function calculateMAStatus(
  ma20: number | null,
  ma50: number | null,
  ma100: number | null,
  ma200: number | null
): StockMAStatus {
  // 정배열: MA20 > MA50 > MA100 > MA200
  const ordered =
    ma20 !== null &&
    ma50 !== null &&
    ma100 !== null &&
    ma200 !== null &&
    ma20 > ma50 &&
    ma50 > ma100 &&
    ma100 > ma200;

  // 골든크로스: MA50 > MA200
  const goldenCross = ma50 !== null && ma200 !== null && ma50 > ma200;

  return {
    ordered,
    goldenCross,
  };
}
