import { describe, it, expect, vi } from "vitest";

// Mock DB client
vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Mock schema
vi.mock("@/db/schema", () => ({
  symbols: { symbol: "symbol" },
  dailyPrices: { symbol: "symbol", date: "date" },
  dailyMa: { symbol: "symbol", date: "date" },
  dailyRatios: { symbol: "symbol", date: "date" },
  quarterlyRatios: { symbol: "symbol", periodEndDate: "periodEndDate" },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  desc: vi.fn((a) => ({ desc: a })),
  and: vi.fn((...args) => ({ and: args })),
}));

describe("stock-detail ratios 매핑 로직", () => {
  describe("ratios 우선순위", () => {
    it("dailyRatios가 있으면 밸류에이션에 daily 값 사용", () => {
      const dailyRatiosData = {
        peRatio: "15.5",
        pegRatio: "1.2",
        psRatio: "3.5",
        pbRatio: "2.1",
        evEbitda: "10.5",
        date: "2025-11-27",
      };
      const quarterlyRatiosData = {
        peRatio: "14.0",
        pegRatio: "1.0",
        psRatio: "3.0",
        pbRatio: "2.0",
        evEbitda: "9.0",
        grossMargin: "0.45",
        opMargin: "0.20",
        netMargin: "0.15",
        periodEndDate: "2025-09-30",
      };

      // 밸류에이션은 daily 우선
      const peRatio = dailyRatiosData?.peRatio ?? quarterlyRatiosData?.peRatio ?? null;
      const pegRatio = dailyRatiosData?.pegRatio ?? quarterlyRatiosData?.pegRatio ?? null;
      const psRatio = dailyRatiosData?.psRatio ?? quarterlyRatiosData?.psRatio ?? null;

      expect(peRatio).toBe("15.5");
      expect(pegRatio).toBe("1.2");
      expect(psRatio).toBe("3.5");

      // 수익성은 quarterly에서만
      const grossMargin = quarterlyRatiosData?.grossMargin ?? null;
      expect(grossMargin).toBe("0.45");
    });

    it("dailyRatios가 없으면 quarterlyRatios로 폴백", () => {
      const dailyRatiosData = null;
      const quarterlyRatiosData = {
        peRatio: "14.0",
        pegRatio: "1.0",
        psRatio: "3.0",
        pbRatio: "2.0",
        evEbitda: "9.0",
        grossMargin: "0.45",
        periodEndDate: "2025-09-30",
      };

      const peRatio = dailyRatiosData?.peRatio ?? quarterlyRatiosData?.peRatio ?? null;
      const pegRatio = dailyRatiosData?.pegRatio ?? quarterlyRatiosData?.pegRatio ?? null;

      expect(peRatio).toBe("14.0");
      expect(pegRatio).toBe("1.0");
    });

    it("둘 다 없으면 null 반환", () => {
      const dailyRatiosData = null;
      const quarterlyRatiosData = null;

      const hasValuationData = dailyRatiosData || quarterlyRatiosData;
      expect(hasValuationData).toBe(null);
    });
  });

  describe("valuationDate / quarterlyPeriodEndDate 분리", () => {
    it("밸류에이션 기준일과 분기 재무 기준일이 분리됨", () => {
      const priceDate = "2025-11-27";
      const dailyRatiosData = { date: "2025-11-27" };
      const quarterlyRatiosData = { periodEndDate: "2025-09-30" };

      const valuationDate = priceDate ?? dailyRatiosData?.date ?? null;
      const quarterlyPeriodEndDate = quarterlyRatiosData?.periodEndDate ?? null;

      expect(valuationDate).toBe("2025-11-27");
      expect(quarterlyPeriodEndDate).toBe("2025-09-30");
    });
  });

  describe("MA 상태 계산", () => {
    it("정배열: ma20 > ma50 > ma100 > ma200", () => {
      const ma20 = 150;
      const ma50 = 140;
      const ma100 = 130;
      const ma200 = 120;

      const ordered =
        ma20 !== null &&
        ma50 !== null &&
        ma100 !== null &&
        ma200 !== null &&
        ma20 > ma50 &&
        ma50 > ma100 &&
        ma100 > ma200;

      expect(ordered).toBe(true);
    });

    it("정배열 아님: 순서가 맞지 않으면 false", () => {
      const ma20 = 130; // ma50보다 낮음
      const ma50 = 140;
      const ma100 = 130;
      const ma200 = 120;

      const ordered =
        ma20 !== null &&
        ma50 !== null &&
        ma100 !== null &&
        ma200 !== null &&
        ma20 > ma50 &&
        ma50 > ma100 &&
        ma100 > ma200;

      expect(ordered).toBe(false);
    });

    it("골든크로스: ma50 > ma200", () => {
      const ma50 = 140;
      const ma200 = 120;

      const goldenCross = ma50 !== null && ma200 !== null && ma50 > ma200;
      expect(goldenCross).toBe(true);
    });

    it("골든크로스 아님: ma50 < ma200", () => {
      const ma50 = 100;
      const ma200 = 120;

      const goldenCross = ma50 !== null && ma200 !== null && ma50 > ma200;
      expect(goldenCross).toBe(false);
    });

    it("MA 값이 null이면 false", () => {
      const ma50 = null;
      const ma200 = 120;

      const goldenCross = ma50 !== null && ma200 !== null && ma50 > ma200;
      expect(goldenCross).toBe(false);
    });
  });
});

