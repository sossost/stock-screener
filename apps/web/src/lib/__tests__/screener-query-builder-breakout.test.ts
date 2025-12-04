import { describe, expect, it } from "vitest";
import { buildScreenerQuery } from "../screener/query-builder";
import type { ScreenerParams } from "@/types/screener";

describe("buildScreenerQuery - breakoutStrategy", () => {
  it("includes join and filter for confirmed breakout", () => {
    const sql = buildScreenerQuery({
      breakoutStrategy: "confirmed",
    } as ScreenerParams);

    // SQL 객체를 JSON으로 변환하여 확인
    const sqlStr = JSON.stringify(sql);
    expect(sqlStr).toContain("daily_breakout_signals");
    expect(sqlStr).toContain("is_confirmed_breakout");
  });

  it("includes join and filter for perfect retest", () => {
    const sql = buildScreenerQuery({
      breakoutStrategy: "retest",
    } as ScreenerParams);

    // SQL 객체를 JSON으로 변환하여 확인
    const sqlStr = JSON.stringify(sql);
    expect(sqlStr).toContain("daily_breakout_signals");
    expect(sqlStr).toContain("is_perfect_retest");
  });

  it("does not join breakout signals when breakoutStrategy is null", () => {
    const sql = buildScreenerQuery({
      breakoutStrategy: null,
    } as ScreenerParams);

    // SQL 객체를 JSON으로 변환하여 확인
    const sqlStr = JSON.stringify(sql);
    expect(sqlStr).not.toContain("daily_breakout_signals");
  });
});
