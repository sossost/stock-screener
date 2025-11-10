export function formatNumber(v: string | number | null): string {
  if (v == null) return "-";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "-";

  const abs = Math.abs(n);

  const format = (num: number, div: number, suffix: string) => {
    const val = num / div;
    return (Number.isInteger(val) ? val.toString() : val.toFixed(2)) + suffix;
  };

  if (abs >= 1e12) return format(n, 1e12, "T");
  if (abs >= 1e9) return format(n, 1e9, "B");
  if (abs >= 1e6) return format(n, 1e6, "M");
  if (abs >= 1e3) return format(n, 1e3, "K");
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

export function formatPercent(value: any, decimals = 1): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";

  // 소수점 고정 후 불필요한 .0 제거
  return n.toFixed(decimals).replace(/\.0+$/, "") + "%";
}

/**
 * 통화 포맷팅 (백만/십억 단위)
 * @param value - 달러 단위 숫자
 * @returns 포맷된 문자열 ($48.5B, $120.3M 등)
 */
export function formatCurrency(value: string | number | null): string {
  if (value === null || value === undefined) return "-";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return "-";

  const absNum = Math.abs(num);

  if (absNum >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  } else if (absNum >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else {
    return `${num.toFixed(2)}`;
  }
}

/**
 * 수익성 뱃지 스타일 반환
 * @param status - profitability_status
 * @returns Tailwind CSS 클래스 문자열
 */
export function getProfitabilityBadgeClass(
  status: "profitable" | "unprofitable" | "unknown"
): string {
  switch (status) {
    case "profitable":
      return "bg-green-100 text-green-800";
    case "unprofitable":
      return "bg-red-100 text-red-800";
    case "unknown":
      return "bg-gray-100 text-gray-600";
  }
}

/**
 * 수익성 뱃지 텍스트 반환
 * @param status - profitability_status
 * @returns 표시할 텍스트
 */
export function getProfitabilityLabel(
  status: "profitable" | "unprofitable" | "unknown"
): string {
  switch (status) {
    case "profitable":
      return "흑자";
    case "unprofitable":
      return "적자";
    case "unknown":
      return "-";
  }
}

/**
 * 날짜 문자열을 "Q1 2024" 형식의 분기 문자열로 변환
 * @param dateString - "2024-03-31" 형식의 날짜 문자열
 * @returns "Q1 2024" 형식의 분기 문자열
 */
export function formatQuarter(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `Q${quarter} ${year}`;
}

/**
 * PER 또는 PEG 값을 포맷팅 (소수점 2자리, null이면 "-")
 * @param value - PER 또는 PEG 값
 * @returns 포맷팅된 문자열
 */
export function formatRatio(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return value.toFixed(2);
}
