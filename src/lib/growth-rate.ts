/**
 * 분기별 재무 데이터를 기반으로 평균 성장률을 계산하는 유틸리티 함수
 */

export interface QuarterlyData {
  period_end_date: string;
  value: number | null;
}

/**
 * 분기별 성장률을 계산합니다.
 * @param current 현재 분기 값
 * @param previous 이전 분기 값
 * @returns 성장률 (%), null이면 계산 불가
 */
export function calculateGrowthRate(
  current: number | null,
  previous: number | null
): number | null {
  // NULL 값 처리
  if (current === null || previous === null) {
    return null;
  }

  // 0으로 나누기 방지
  if (previous === 0) {
    return null;
  }

  // 성장률 계산: (현재 - 이전) / 이전 × 100
  return ((current - previous) / previous) * 100;
}

/**
 * 분기별 데이터 배열에서 평균 성장률을 계산합니다.
 * @param quarters 분기별 데이터 배열 (최신순으로 정렬되어 있어야 함)
 * @param quartersCount 계산할 분기 수
 * @returns 평균 성장률 (%), null이면 계산 불가
 */
export function calculateAverageGrowthRate(
  quarters: QuarterlyData[],
  quartersCount: number
): number | null {
  if (quarters.length < quartersCount) {
    return null;
  }

  // 최신 N개 분기만 사용
  const recentQuarters = quarters.slice(0, quartersCount);

  // NULL이 아닌 분기만 필터링 (음수는 유효함, 0은 나중에 제외)
  const validQuarters = recentQuarters.filter((q) => q.value !== null);

  if (validQuarters.length < 2) {
    return null;
  }

  // 분기별 성장률 계산 (연속된 유효한 분기 간)
  const growthRates: number[] = [];

  for (let i = 0; i < validQuarters.length - 1; i++) {
    const current = validQuarters[i].value;
    const previous = validQuarters[i + 1].value;

    // 이미 필터링했지만 타입 안전성을 위해 체크
    if (current === null || previous === null) {
      continue;
    }

    // 0으로 나누기 방지 (이전 분기가 0이면 계산 불가)
    if (previous === 0) {
      continue;
    }

    const growthRate = calculateGrowthRate(current, previous);
    if (growthRate !== null) {
      growthRates.push(growthRate);
    }
  }

  // 성장률이 하나도 없으면 null 반환
  if (growthRates.length === 0) {
    return null;
  }

  // 평균 계산
  const sum = growthRates.reduce((acc, rate) => acc + rate, 0);
  return sum / growthRates.length;
}

/**
 * 분기별 매출 데이터에서 평균 매출 성장률을 계산합니다.
 * @param quarters 분기별 매출 데이터 배열
 * @param quartersCount 계산할 분기 수
 * @returns 평균 매출 성장률 (%)
 */
export function calculateRevenueAverageGrowthRate(
  quarters: QuarterlyData[],
  quartersCount: number
): number | null {
  return calculateAverageGrowthRate(quarters, quartersCount);
}

/**
 * 분기별 EPS 데이터에서 평균 EPS 성장률을 계산합니다.
 * @param quarters 분기별 EPS 데이터 배열
 * @param quartersCount 계산할 분기 수
 * @returns 평균 EPS 성장률 (%)
 */
export function calculateEPSAverageGrowthRate(
  quarters: QuarterlyData[],
  quartersCount: number
): number | null {
  return calculateAverageGrowthRate(quarters, quartersCount);
}
