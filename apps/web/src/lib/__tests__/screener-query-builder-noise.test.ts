import { describe, expect, it } from "vitest";
import { buildScreenerQuery } from "../screener/query-builder";
import type { ScreenerParams } from "@/types/screener";

describe("buildScreenerQuery - noise filters", () => {
  it("includes join and filter for volume filter", () => {
    const sql = buildScreenerQuery({
      volumeFilter: true,
    } as ScreenerParams);

    // SQL 객체를 JSON으로 변환하여 확인
    const sqlStr = JSON.stringify(sql);
    expect(sqlStr).toContain("daily_noise_signals");
    expect(sqlStr).toContain("avg_dollar_volume_20d");
    expect(sqlStr).toContain("avg_volume_20d");
  });

  it("includes join and filter for VCP filter", () => {
    const sql = buildScreenerQuery({
      vcpFilter: true,
    } as ScreenerParams);

    // SQL 객체를 JSON으로 변환하여 확인
    const sqlStr = JSON.stringify(sql);
    expect(sqlStr).toContain("daily_noise_signals");
    expect(sqlStr).toContain("is_vcp");
  });

  it("includes join and filter for body filter", () => {
    const sql = buildScreenerQuery({
      bodyFilter: true,
    } as ScreenerParams);

    // SQL 객체를 JSON으로 변환하여 확인
    const sqlStr = JSON.stringify(sql);
    expect(sqlStr).toContain("daily_noise_signals");
    expect(sqlStr).toContain("body_ratio");
  });

  it("includes join and filter for MA convergence filter", () => {
    const sql = buildScreenerQuery({
      maConvergenceFilter: true,
    } as ScreenerParams);

    // SQL 객체를 JSON으로 변환하여 확인
    const sqlStr = JSON.stringify(sql);
    expect(sqlStr).toContain("daily_noise_signals");
    expect(sqlStr).toContain("ma20_ma50_distance_percent");
  });

  it("does not join noise signals when all filters are false", () => {
    const sql = buildScreenerQuery({
      volumeFilter: false,
      vcpFilter: false,
      bodyFilter: false,
      maConvergenceFilter: false,
    } as ScreenerParams);

    // SQL 객체를 JSON으로 변환하여 확인
    const sqlStr = JSON.stringify(sql);
    expect(sqlStr).not.toContain("daily_noise_signals");
  });

  it("includes join when at least one filter is true", () => {
    const sql = buildScreenerQuery({
      volumeFilter: true,
      vcpFilter: false,
      bodyFilter: false,
      maConvergenceFilter: false,
    } as ScreenerParams);

    // SQL 객체를 JSON으로 변환하여 확인
    const sqlStr = JSON.stringify(sql);
    expect(sqlStr).toContain("daily_noise_signals");
  });
});
