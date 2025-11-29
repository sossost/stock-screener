import type { QuarterlyFinancial } from "@/types/screener";
import { formatQuarter } from "@/utils/format";

/**
 * 재무 데이터를 차트 데이터 형식으로 변환
 * @param financials - 분기별 재무 데이터 배열
 * @param type - "revenue" 또는 "eps"
 * @returns 차트에 사용할 데이터 배열
 */
export function prepareChartData(
  financials: QuarterlyFinancial[],
  type: "revenue" | "eps"
) {
  if (!financials || financials.length === 0) return [];

  return financials.map((f) => ({
    quarter: formatQuarter(f.period_end_date),
    value: type === "revenue" ? f.revenue : f.eps_diluted,
    date: f.period_end_date,
  }));
}
