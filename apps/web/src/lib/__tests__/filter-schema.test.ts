import { describe, expect, it } from "vitest";
import {
  buildCacheTag,
  buildQueryParams,
  filterDefaults,
  parseFilters,
} from "../filters/schema";

describe("parseFilters", () => {
  it("returns defaults when no params are provided", () => {
    const result = parseFilters({});
    // URL 파라미터가 없으면 MA 필터는 false로 설정됨 (명시적으로 true일 때만 적용)
    expect(result).toEqual({
      ...filterDefaults,
      ordered: false,
      goldenCross: false,
      justTurned: false,
      ma20Above: false,
      ma50Above: false,
      ma100Above: false,
      ma200Above: false,
    });
  });

  it("falls back to defaults when numeric params are invalid", () => {
    expect(
      parseFilters({
        lookbackDays: "abc",
        revenueGrowthRate: "nan",
        incomeGrowthRate: "NaN",
      })
    ).toEqual(filterDefaults);
  });

  it("normalizes array params to their first value", () => {
    const parsed = parseFilters({
      profitability: ["profitable", "all"],
    });

    expect(parsed.profitability).toBe("profitable");
  });
});

describe("buildQueryParams", () => {
  it("omits nullable growth rates when they are null", () => {
    const params = buildQueryParams({
      ...filterDefaults,
      revenueGrowthRate: null,
      incomeGrowthRate: null,
    });

    expect(params.get("revenueGrowthRate")).toBeNull();
    expect(params.get("incomeGrowthRate")).toBeNull();
  });
});

describe("buildCacheTag", () => {
  it("does not include undefined placeholders", () => {
    const tag = buildCacheTag({
      ...filterDefaults,
      revenueGrowthRate: null,
      incomeGrowthRate: null,
    });

    expect(tag).not.toContain("undefined");
    expect(tag).not.toContain("nullnull"); // 두 성장률이 null일 때 구분자만 남도록 방지
  });
});
