import { describe, it, expect } from "vitest";
import {
  calculateSMA,
  calculateEMA,
  calculateRSIWithTime,
  calculateMACDWithTime,
  calculateMAWithTime,
  type OHLCData,
} from "../technical-indicators";

describe("technical-indicators", () => {
  // 테스트용 샘플 데이터
  const sampleData: OHLCData[] = [
    { time: "2024-01-01", open: 100, high: 105, low: 99, close: 102 },
    { time: "2024-01-02", open: 102, high: 108, low: 101, close: 107 },
    { time: "2024-01-03", open: 107, high: 110, low: 106, close: 109 },
    { time: "2024-01-04", open: 109, high: 112, low: 107, close: 108 },
    { time: "2024-01-05", open: 108, high: 111, low: 105, close: 106 },
    { time: "2024-01-08", open: 106, high: 109, low: 104, close: 108 },
    { time: "2024-01-09", open: 108, high: 113, low: 107, close: 112 },
    { time: "2024-01-10", open: 112, high: 115, low: 110, close: 114 },
    { time: "2024-01-11", open: 114, high: 118, low: 113, close: 117 },
    { time: "2024-01-12", open: 117, high: 120, low: 115, close: 118 },
    { time: "2024-01-15", open: 118, high: 122, low: 116, close: 120 },
    { time: "2024-01-16", open: 120, high: 124, low: 118, close: 122 },
    { time: "2024-01-17", open: 122, high: 125, low: 120, close: 121 },
    { time: "2024-01-18", open: 121, high: 123, low: 118, close: 119 },
    { time: "2024-01-19", open: 119, high: 121, low: 117, close: 120 },
    { time: "2024-01-22", open: 120, high: 125, low: 119, close: 124 },
    { time: "2024-01-23", open: 124, high: 128, low: 123, close: 127 },
    { time: "2024-01-24", open: 127, high: 130, low: 125, close: 128 },
    { time: "2024-01-25", open: 128, high: 132, low: 126, close: 130 },
    { time: "2024-01-26", open: 130, high: 133, low: 128, close: 131 },
  ];

  describe("calculateSMA", () => {
    it("5일 SMA를 정확하게 계산해야 한다", () => {
      const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
      const sma = calculateSMA(closes, 5);

      // 처음 4개는 NaN
      expect(sma[0]).toBeNaN();
      expect(sma[3]).toBeNaN();

      // 5번째부터 유효한 값
      expect(sma[4]).toBe(12); // (10+11+12+13+14)/5 = 12
      expect(sma[5]).toBe(13); // (11+12+13+14+15)/5 = 13
      expect(sma[9]).toBe(17); // (15+16+17+18+19)/5 = 17
    });

    it("period가 데이터 길이보다 크면 모두 NaN", () => {
      const closes = [10, 11, 12];
      const sma = calculateSMA(closes, 5);

      expect(sma.every((v) => isNaN(v))).toBe(true);
    });
  });

  describe("calculateEMA", () => {
    it("EMA를 계산해야 한다", () => {
      const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
      const ema = calculateEMA(closes, 5);

      // 처음 4개는 NaN
      expect(ema[0]).toBeNaN();
      expect(ema[3]).toBeNaN();

      // 5번째는 SMA와 동일
      expect(ema[4]).toBe(12);

      // 이후는 EMA 공식 적용
      // EMA = (Close - EMA_prev) * (2/(5+1)) + EMA_prev
      // multiplier = 2/6 = 0.333...
      const multiplier = 2 / 6;
      const expectedEma5 = (15 - 12) * multiplier + 12;
      expect(ema[5]).toBeCloseTo(expectedEma5, 5);
    });
  });

  describe("calculateRSIWithTime", () => {
    it("RSI 값이 0-100 사이여야 한다", () => {
      const rsi = calculateRSIWithTime(sampleData, 14);

      rsi.forEach((r) => {
        expect(r.value).toBeGreaterThanOrEqual(0);
        expect(r.value).toBeLessThanOrEqual(100);
      });
    });

    it("상승 추세에서 RSI가 50 이상이어야 한다", () => {
      // 계속 상승하는 데이터
      const uptrend: OHLCData[] = Array.from({ length: 20 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, "0")}`,
        open: 100 + i,
        high: 102 + i,
        low: 99 + i,
        close: 101 + i,
      }));

      const rsi = calculateRSIWithTime(uptrend, 14);
      const lastRSI = rsi[rsi.length - 1];

      expect(lastRSI.value).toBeGreaterThan(50);
    });

    it("하락 추세에서 RSI가 50 이하여야 한다", () => {
      // 계속 하락하는 데이터
      const downtrend: OHLCData[] = Array.from({ length: 20 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, "0")}`,
        open: 200 - i,
        high: 202 - i,
        low: 199 - i,
        close: 199 - i,
      }));

      const rsi = calculateRSIWithTime(downtrend, 14);
      const lastRSI = rsi[rsi.length - 1];

      expect(lastRSI.value).toBeLessThan(50);
    });

    it("데이터가 부족하면 빈 배열을 반환해야 한다", () => {
      const shortData = sampleData.slice(0, 5);
      const rsi = calculateRSIWithTime(shortData, 14);

      expect(rsi).toHaveLength(0);
    });

    it("time 속성이 올바르게 매핑되어야 한다", () => {
      const rsi = calculateRSIWithTime(sampleData, 14);

      expect(rsi[0].time).toBe(sampleData[0].time);
      expect(rsi[rsi.length - 1].time).toBe(
        sampleData[sampleData.length - 1].time
      );
    });
  });

  describe("calculateMACDWithTime", () => {
    // MACD 테스트를 위해 더 긴 데이터 필요 (최소 35개)
    const longData: OHLCData[] = Array.from({ length: 50 }, (_, i) => ({
      time: `2024-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      open: 100 + Math.sin(i * 0.5) * 10,
      high: 105 + Math.sin(i * 0.5) * 10,
      low: 95 + Math.sin(i * 0.5) * 10,
      close: 100 + Math.sin(i * 0.5) * 10 + (i % 5),
    }));

    it("MACD 데이터 구조가 올바라야 한다", () => {
      const macd = calculateMACDWithTime(longData);

      expect(macd.length).toBe(longData.length);
      expect(macd[0]).toHaveProperty("time");
      expect(macd[0]).toHaveProperty("macd");
      expect(macd[0]).toHaveProperty("signal");
      expect(macd[0]).toHaveProperty("histogram");
    });

    it("histogram = macd - signal 이어야 한다", () => {
      const macd = calculateMACDWithTime(longData);

      // 유효한 데이터 (slow period 이후)에서 확인
      const validData = macd.slice(35);
      validData.forEach((d) => {
        expect(d.histogram).toBeCloseTo(d.macd - d.signal, 5);
      });
    });

    it("데이터가 부족하면 빈 배열을 반환해야 한다", () => {
      const shortData = sampleData.slice(0, 10);
      const macd = calculateMACDWithTime(shortData);

      expect(macd).toHaveLength(0);
    });
  });

  describe("calculateMAWithTime", () => {
    it("이동평균선 데이터를 time과 함께 반환해야 한다", () => {
      const ma20 = calculateMAWithTime(sampleData, 5);

      expect(ma20.length).toBe(sampleData.length);
      expect(ma20[0]).toHaveProperty("time");
      expect(ma20[0]).toHaveProperty("value");
      expect(ma20[0].time).toBe(sampleData[0].time);
    });

    it("SMA 값이 정확해야 한다", () => {
      const ma5 = calculateMAWithTime(sampleData, 5);

      // 5번째 데이터부터 유효
      const closes = sampleData.map((d) => d.close);
      const expected =
        (closes[0] + closes[1] + closes[2] + closes[3] + closes[4]) / 5;

      expect(ma5[4].value).toBeCloseTo(expected, 5);
    });
  });
});
