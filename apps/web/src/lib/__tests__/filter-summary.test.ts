import { describe, it, expect } from "vitest";
import { getProfitabilityFilterSummary } from "../filter-summary";

describe("getProfitabilityFilterSummary", () => {
  it("최근 흑자 전환 필터 요약을 추가한다", () => {
    const summary = getProfitabilityFilterSummary({
      turnAround: true,
    });

    expect(summary.activeFilters).toContain("최근 분기 흑자 전환");
    expect(summary.count).toBe(1);
    expect(summary.summaryText).toContain("흑자 전환");
  });

  it("다른 수익성 필터와 함께 표시된다", () => {
    const summary = getProfitabilityFilterSummary({
      profitability: "profitable",
      turnAround: true,
    });

    expect(summary.activeFilters).toEqual(["흑자", "최근 분기 흑자 전환"]);
    expect(summary.count).toBe(2);
  });
});
