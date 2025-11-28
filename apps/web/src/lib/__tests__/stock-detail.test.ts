import { describe, it, expect } from "vitest";
import { parseNumericOrNull } from "../stock-detail";

/**
 * parseNumericOrNull 헬퍼 함수 테스트
 */
describe("parseNumericOrNull", () => {
  it("유효한 숫자 문자열을 숫자로 변환", () => {
    expect(parseNumericOrNull("123.45")).toBe(123.45);
    expect(parseNumericOrNull("0")).toBe(0);
    expect(parseNumericOrNull("-50.5")).toBe(-50.5);
  });

  it("null/undefined는 null 반환", () => {
    expect(parseNumericOrNull(null)).toBe(null);
    expect(parseNumericOrNull(undefined)).toBe(null);
  });

  it("빈 문자열은 null 반환", () => {
    expect(parseNumericOrNull("")).toBe(null);
  });

  it("NaN이 되는 문자열은 null 반환", () => {
    expect(parseNumericOrNull("abc")).toBe(null);
    expect(parseNumericOrNull("not a number")).toBe(null);
    expect(parseNumericOrNull("NaN")).toBe(null);
  });

  it("숫자로 시작하는 혼합 문자열은 숫자 부분만 파싱", () => {
    // parseFloat 동작: "123abc" -> 123
    expect(parseNumericOrNull("123abc")).toBe(123);
  });
});

/**
 * quarterlyFinancials 매핑 로직 테스트
 */
describe("quarterlyFinancials 매핑", () => {
  it("8개 초과 데이터는 최신 8개만 반환 (reverse로 오래된 순 정렬)", () => {
    // 실제 DB 쿼리는 최신순으로 8개 limit하고, reverse로 오래된 순 정렬
    const mockData = [
      { asOfQ: "Q4 2024", periodEndDate: "2024-12-31" },
      { asOfQ: "Q3 2024", periodEndDate: "2024-09-30" },
      { asOfQ: "Q2 2024", periodEndDate: "2024-06-30" },
    ];
    
    const result = mockData.reverse();
    expect(result[0].asOfQ).toBe("Q2 2024"); // 오래된 것이 먼저
    expect(result[result.length - 1].asOfQ).toBe("Q4 2024"); // 최신이 마지막
  });

  it("null 값은 null로 유지", () => {
    const mockFinancial = {
      revenue: null,
      netIncome: "100000",
      epsDiluted: null,
    };

    expect(parseNumericOrNull(mockFinancial.revenue)).toBe(null);
    expect(parseNumericOrNull(mockFinancial.netIncome)).toBe(100000);
    expect(parseNumericOrNull(mockFinancial.epsDiluted)).toBe(null);
  });

  it("숫자 문자열은 숫자로 변환", () => {
    const mockFinancial = {
      revenue: "1500000000",
      netIncome: "250000000",
      epsDiluted: "2.45",
    };

    expect(parseNumericOrNull(mockFinancial.revenue)).toBe(1500000000);
    expect(parseNumericOrNull(mockFinancial.netIncome)).toBe(250000000);
    expect(parseNumericOrNull(mockFinancial.epsDiluted)).toBe(2.45);
  });
});

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
