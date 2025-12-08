/**
 * 기술적 지표 계산 유틸리티
 *
 * - RSI (Relative Strength Index): 14일 기준
 * - MACD (Moving Average Convergence Divergence): 12/26/9 기준
 * - EMA (Exponential Moving Average)
 * - SMA (Simple Moving Average)
 */

export interface OHLCData {
  time: string; // 'YYYY-MM-DD'
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface RSIData {
  time: string;
  value: number;
}

export interface MACDData {
  time: string;
  macd: number;
  signal: number;
  histogram: number;
}

export interface IchimokuData {
  time: string; // 'YYYY-MM-DD'
  tenkanSen: number | null; // 전환선
  kijunSen: number | null; // 기준선
  senkouSpanA: number | null; // 선행스팬 A (26일 앞으로 이동)
  senkouSpanB: number | null; // 선행스팬 B (26일 앞으로 이동)
}

export interface MAData {
  time: string;
  value: number;
}

/**
 * SMA (Simple Moving Average) 계산
 */
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }

  return result;
}

/**
 * EMA (Exponential Moving Average) 계산
 */
export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  // 첫 번째 EMA는 SMA로 시작
  let ema = 0;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      // 첫 EMA는 SMA
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      ema = sum / period;
      result.push(ema);
    } else {
      // EMA = (Close - EMA(prev)) * multiplier + EMA(prev)
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
  }

  return result;
}

/**
 * RSI (Relative Strength Index) 계산
 * 기본 period: 14일
 * @deprecated 대신 calculateRSIWithTime 사용 권장
 */
export function calculateRSI(closes: number[], period: number = 14): RSIData[] {
  if (closes.length < period + 1) {
    return [];
  }

  const gains: number[] = [];
  const losses: number[] = [];

  // 가격 변화 계산
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  const result: number[] = [];

  // 첫 번째 평균 계산 (SMA)
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // period 이전은 NaN
  for (let i = 0; i < period; i++) {
    result.push(NaN);
  }

  // 첫 번째 RSI
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs));

  // 이후 RSI (Wilder's Smoothing Method)
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    const currentRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + currentRS));
  }

  return result.map((value) => ({
    time: "", // 나중에 채움
    value: isNaN(value) ? 50 : value, // NaN은 50으로 대체 (중립)
  }));
}

/**
 * RSI 계산 (시간 정보 포함)
 */
export function calculateRSIWithTime(
  data: OHLCData[],
  period: number = 14
): RSIData[] {
  const closes = data.map((d) => d.close);

  if (closes.length < period + 1) {
    return [];
  }

  const gains: number[] = [];
  const losses: number[] = [];

  // 가격 변화 계산
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  const result: RSIData[] = [];

  // 첫 번째 평균 계산 (SMA)
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // period 이전은 건너뜀 (또는 50으로 표시)
  for (let i = 0; i < period; i++) {
    result.push({
      time: data[i].time,
      value: 50, // 중립값
    });
  }

  // 첫 번째 RSI
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({
    time: data[period].time,
    value: 100 - 100 / (1 + rs),
  });

  // 이후 RSI (Wilder's Smoothing Method)
  for (let i = period; i < gains.length; i++) {
    // 배열 범위 체크
    if (i + 1 >= data.length) break;

    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    const currentRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({
      time: data[i + 1].time,
      value: 100 - 100 / (1 + currentRS),
    });
  }

  return result;
}

/**
 * MACD (Moving Average Convergence Divergence) 계산
 * 기본값: fast=12, slow=26, signal=9
 */
export function calculateMACDWithTime(
  data: OHLCData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDData[] {
  const closes = data.map((d) => d.close);

  if (closes.length < slowPeriod + signalPeriod) {
    return [];
  }

  // EMA 계산
  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);

  // MACD Line = EMA(fast) - EMA(slow)
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(emaFast[i]) || isNaN(emaSlow[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(emaFast[i] - emaSlow[i]);
    }
  }

  // Signal Line = EMA of MACD Line
  const validMacd = macdLine.filter((v) => !isNaN(v));
  const signalEMA = calculateEMA(validMacd, signalPeriod);

  // 결과 조합
  const result: MACDData[] = [];
  let signalIndex = 0;

  for (let i = 0; i < closes.length; i++) {
    if (isNaN(macdLine[i])) {
      result.push({
        time: data[i].time,
        macd: 0,
        signal: 0,
        histogram: 0,
      });
    } else {
      const signal =
        signalIndex < signalEMA.length ? signalEMA[signalIndex] : 0;
      const macd = macdLine[i];
      const histogram = isNaN(signal) ? 0 : macd - signal;

      result.push({
        time: data[i].time,
        macd: macd,
        signal: isNaN(signal) ? macd : signal,
        histogram: histogram,
      });
      signalIndex++;
    }
  }

  return result;
}

/**
 * 이동평균선 데이터 생성 (차트용)
 */
export function calculateMAWithTime(
  data: OHLCData[],
  period: number
): MAData[] {
  const closes = data.map((d) => d.close);
  const sma = calculateSMA(closes, period);

  return data.map((d, i) => ({
    time: d.time,
    value: sma[i],
  }));
}

/**
 * ATR (Average True Range) 계산
 * 변동성 측정 지표
 * @param data OHLC 데이터
 * @param period 기간 (기본값: 14)
 * @returns ATR 값 (마지막 값만 반환)
 */
export function calculateATR(
  data: OHLCData[],
  period: number = 14
): number | null {
  // period 유효성 검사
  if (!Number.isFinite(period) || period <= 0) {
    return null;
  }

  if (data.length < period + 1) {
    return null;
  }

  const trueRanges: number[] = [];

  // True Range 계산
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const previous = data[i - 1];

    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - previous.close);
    const tr3 = Math.abs(current.low - previous.close);

    const trueRange = Math.max(tr1, tr2, tr3);
    trueRanges.push(trueRange);
  }

  if (trueRanges.length < period) {
    return null;
  }

  // 첫 번째 ATR: True Range의 SMA
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // 이후 ATR: Wilder's Smoothing Method
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return atr;
}

/**
 * 일목균형표 계산
 * @param data OHLC 데이터 (최소 52일 이상 필요)
 * @returns IchimokuData 배열
 */
export function calculateIchimokuWithTime(data: OHLCData[]): IchimokuData[] {
  if (data.length < 52) {
    return data.map((d) => ({
      time: d.time,
      tenkanSen: null,
      kijunSen: null,
      senkouSpanA: null,
      senkouSpanB: null,
    }));
  }

  // 1. 전환선 계산 (9일 고저 평균)
  const tenkanSen: number[] = [];
  for (let i = 8; i < data.length; i++) {
    const highs = data.slice(i - 8, i + 1).map((d) => d.high);
    const lows = data.slice(i - 8, i + 1).map((d) => d.low);
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    tenkanSen.push((maxHigh + minLow) / 2);
  }

  // 2. 기준선 계산 (26일 고저 평균)
  const kijunSen: number[] = [];
  for (let i = 25; i < data.length; i++) {
    const highs = data.slice(i - 25, i + 1).map((d) => d.high);
    const lows = data.slice(i - 25, i + 1).map((d) => d.low);
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    kijunSen.push((maxHigh + minLow) / 2);
  }

  // 3. 선행스팬 A 계산: (전환선 + 기준선) / 2
  const senkouSpanA: number[] = [];
  // 전환선과 기준선이 모두 계산 가능한 지점부터 시작 (26일째부터)
  for (let i = 0; i < Math.min(tenkanSen.length, kijunSen.length); i++) {
    senkouSpanA.push((tenkanSen[i] + kijunSen[i]) / 2);
  }

  // 4. 선행스팬 B 계산 (52일 고저 평균)
  const senkouSpanB: number[] = [];
  for (let i = 51; i < data.length; i++) {
    const highs = data.slice(i - 51, i + 1).map((d) => d.high);
    const lows = data.slice(i - 51, i + 1).map((d) => d.low);
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    senkouSpanB.push((maxHigh + minLow) / 2);
  }

  // 5. 결과 조합
  const result: IchimokuData[] = [];

  // 초기 데이터는 null로 채움
  for (let i = 0; i < data.length; i++) {
    result.push({
      time: data[i].time,
      tenkanSen: null, // 나중에 채움
      kijunSen: null, // 나중에 채움
      senkouSpanA: null, // 나중에 26일 앞으로 이동하여 채움
      senkouSpanB: null, // 나중에 26일 앞으로 이동하여 채움
    });
  }

  // 전환선 배치 (data[8]부터, 9일째)
  for (let i = 8; i < data.length; i++) {
    const tenkanIdx = i - 8;
    if (tenkanIdx >= 0 && tenkanIdx < tenkanSen.length) {
      result[i].tenkanSen = tenkanSen[tenkanIdx];
    }
  }

  // 기준선 배치 (data[25]부터, 26일째)
  // 기준선은 26일째부터 계산 가능하므로 data[25] (26일째)부터 배치
  for (let i = 25; i < data.length; i++) {
    const kijunIdx = i - 25;
    if (kijunIdx >= 0 && kijunIdx < kijunSen.length) {
      result[i].kijunSen = kijunSen[kijunIdx];
    }
  }

  // 선행스팬 A 계산: (전환선 + 기준선) / 2
  // 기준선이 계산된 지점(data[25])부터 시작
  // 이 시점에서 전환선은 이미 계산됨 (tenkanSen[17] = data[25])
  for (let i = 25; i < data.length; i++) {
    const kijunIdx = i - 25;
    const tenkanIdx = i - 8; // 같은 데이터 인덱스의 전환선
    if (
      kijunIdx >= 0 &&
      kijunIdx < kijunSen.length &&
      tenkanIdx >= 0 &&
      tenkanIdx < tenkanSen.length
    ) {
      const senkouA = (tenkanSen[tenkanIdx] + kijunSen[kijunIdx]) / 2;
      // 선행스팬 A는 26일 앞으로 이동
      const futureIdx = i + 26;
      if (futureIdx < result.length) {
        result[futureIdx].senkouSpanA = senkouA;
      }
    }
  }

  // 선행스팬 B 배치 (data[51]부터 계산, 52일째)
  for (let i = 51; i < data.length; i++) {
    const senkouBIdx = i - 51;
    if (senkouBIdx >= 0 && senkouBIdx < senkouSpanB.length) {
      // 선행스팬 B는 26일 앞으로 이동
      const futureIdx = i + 26;
      if (futureIdx < result.length) {
        result[futureIdx].senkouSpanB = senkouSpanB[senkouBIdx];
      }
    }
  }

  return result;
}
