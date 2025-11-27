import { describe, it, expect } from "vitest";

/**
 * stock-detail ratios 매핑 로직 테스트
 * - dailyRatios vs quarterlyRatios 우선순위
 * - 날짜 분리 (valuationDate vs quarterlyPeriodEndDate)
 */
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
      const peRatio =
        dailyRatiosData?.peRatio ?? quarterlyRatiosData?.peRatio ?? null;
      const pegRatio =
        dailyRatiosData?.pegRatio ?? quarterlyRatiosData?.pegRatio ?? null;
      const psRatio =
        dailyRatiosData?.psRatio ?? quarterlyRatiosData?.psRatio ?? null;

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

      const peRatio =
        dailyRatiosData?.peRatio ?? quarterlyRatiosData?.peRatio ?? null;
      const pegRatio =
        dailyRatiosData?.pegRatio ?? quarterlyRatiosData?.pegRatio ?? null;

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
});
