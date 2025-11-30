/**
 * 차트 Y축 레이블 포맷팅
 */
export function formatYLabel(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

/**
 * 차트 X축 레이블 포맷팅 (날짜)
 */
export function formatXLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return "-";
  }
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

