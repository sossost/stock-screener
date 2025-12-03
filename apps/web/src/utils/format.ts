// ===== 헬퍼 함수 =====

/**
 * 불필요한 소수점 0 제거
 * 10.50 → 10.5, 10.00 → 10
 */
function trimTrailingZeros(numStr: string): string {
  if (!numStr.includes(".")) return numStr;
  return numStr.replace(/\.?0+$/, "");
}

/**
 * 천 단위 콤마 추가
 * 1000 → 1,000
 */
function addCommas(numStr: string): string {
  const parts = numStr.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

/**
 * 숫자 포맷팅 (콤마 + 소수점 정리)
 */
function formatWithCommas(value: number, decimals: number = 2): string {
  const fixed = value.toFixed(decimals);
  const trimmed = trimTrailingZeros(fixed);
  return addCommas(trimmed);
}

// ===== 기존 함수들 =====

export function formatNumber(v: string | number | null): string {
  if (v == null) return "-";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "-";

  const abs = Math.abs(n);

  const format = (num: number, div: number, suffix: string) => {
    const val = num / div;
    return trimTrailingZeros(val.toFixed(2)) + suffix;
  };

  if (abs >= 1e12) return format(n, 1e12, "T");
  if (abs >= 1e9) return format(n, 1e9, "B");
  if (abs >= 1e6) return format(n, 1e6, "M");
  if (abs >= 1e3) return format(n, 1e3, "K");
  return formatWithCommas(n, 2);
}

export function formatPercent(
  value: number | string | null,
  decimals = 1
): string {
  if (value == null) return "-";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "-";

  return trimTrailingZeros(n.toFixed(decimals)) + "%";
}

/**
 * 통화 포맷팅 (백만/십억 단위)
 */
export function formatCurrency(value: string | number | null): string {
  if (value === null || value === undefined) return "-";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) return "-";

  const absNum = Math.abs(num);

  if (absNum >= 1_000_000_000) {
    return trimTrailingZeros((num / 1_000_000_000).toFixed(2)) + "B";
  } else if (absNum >= 1_000_000) {
    return trimTrailingZeros((num / 1_000_000).toFixed(2)) + "M";
  } else {
    return formatWithCommas(num, 2);
  }
}

/**
 * 수익성 뱃지 스타일 반환
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
 */
export function formatQuarter(dateString: string): string {
  const parts = dateString.split("-");
  if (parts.length !== 3) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    return `Q${quarter} ${year}`;
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    const date = new Date(dateString);
    const fallbackYear = date.getFullYear();
    const fallbackMonth = date.getMonth() + 1;
    const quarter = Math.ceil(fallbackMonth / 3);
    return `Q${quarter} ${fallbackYear}`;
  }

  const quarter = Math.ceil(month / 3);
  return `Q${quarter} ${year}`;
}

/**
 * PER 또는 PEG 값을 포맷팅
 */
export function formatRatio(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return trimTrailingZeros(value.toFixed(2));
}

/**
 * 주가를 통화 형식으로 포맷팅
 */
export function formatPrice(value: string | number | null): string {
  if (value === null || value === undefined) return "-";

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num) || !Number.isFinite(num)) return "-";

  return "$" + formatWithCommas(num, 2);
}

// ===== 매매일지용 포맷 함수 =====

/**
 * 손익 금액 포맷팅 (테이블용 - K 단위 반올림)
 */
export function formatPnl(value: number): string {
  const absValue = Math.abs(value);
  let formattedValue: string;

  if (absValue >= 1000) {
    formattedValue = `${trimTrailingZeros((absValue / 1000).toFixed(1))}K`;
  } else {
    formattedValue = addCommas(Math.round(absValue).toString());
  }

  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${formattedValue}`;
}

/**
 * 손익 금액 포맷팅 (상세/팝업용 - 전체 숫자 + 콤마)
 */
export function formatPnlFull(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  const absValue = Math.abs(value);
  return `${sign}${formatPrice(absValue)}`;
}

/**
 * 수익률 포맷팅 (부호 포함, 0 제거)
 */
export function formatRoi(value: number): string {
  const percent = value * 100;
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${trimTrailingZeros(percent.toFixed(1))}%`;
}

/**
 * 날짜 포맷팅 (YYYY.MM.DD)
 */
export function formatDateKr(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

/**
 * 수량 포맷팅 (콤마 추가)
 */
export function formatQuantity(value: number): string {
  return addCommas(value.toString());
}

/**
 * 포지션 가치 포맷팅 (테이블용 - K 단위)
 */
export function formatPositionValue(value: number): string {
  const sign = value < 0 ? "-" : "";
  const absValue = Math.abs(value);

  if (absValue >= 1000) {
    const kValue = (absValue / 1000).toFixed(1);
    return `${sign}$${trimTrailingZeros(kValue)}K`;
  }
  return `${sign}$${addCommas(Math.round(absValue).toString())}`;
}

/**
 * 포지션 가치 포맷팅 (상세/팝업용 - 전체 숫자 + 콤마)
 */
export function formatPositionValueFull(value: number): string {
  return formatPrice(value);
}

/**
 * 날짜 문자열을 요일과 함께 포맷팅 (예: "2025-12-03 (화)")
 */
export function formatDateWithWeekday(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) {
    return dateStr; // 유효하지 않은 날짜면 원본 반환
  }
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[date.getDay()];
  return `${dateStr} (${weekday})`;
}