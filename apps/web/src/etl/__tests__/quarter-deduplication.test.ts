import { describe, it, expect } from "vitest";
import { deduplicateByQuarter } from "../utils/quarter-deduplication";

describe("deduplicateByQuarter", () => {
  it("should keep only the latest date for the same quarter", () => {
    const map = new Map<string, { date: string; revenue: number }>();
    // 같은 분기(2025Q2)지만 다른 날짜
    map.set("2025-06-28", { date: "2025-06-28", revenue: 425200000 });
    map.set("2025-06-30", { date: "2025-06-30", revenue: 480700000 });
    // 다른 분기
    map.set("2025-09-27", { date: "2025-09-27", revenue: 500000000 });

    const result = deduplicateByQuarter(map);

    // 같은 분기는 최신 날짜만 유지
    expect(result.size).toBe(2);
    expect(result.get("2025Q2")?.date).toBe("2025-06-30");
    expect(result.get("2025Q2")?.revenue).toBe(480700000);
    expect(result.get("2025Q3")?.date).toBe("2025-09-27");
    expect(result.get("2025Q3")?.revenue).toBe(500000000);
  });

  it("should preserve all data for different quarters", () => {
    const map = new Map<string, { date: string; revenue: number }>();
    map.set("2024-03-31", { date: "2024-03-31", revenue: 100000000 });
    map.set("2024-06-30", { date: "2024-06-30", revenue: 200000000 });
    map.set("2024-09-30", { date: "2024-09-30", revenue: 300000000 });
    map.set("2024-12-31", { date: "2024-12-31", revenue: 400000000 });

    const result = deduplicateByQuarter(map);

    expect(result.size).toBe(4);
    expect(result.get("2024Q1")?.date).toBe("2024-03-31");
    expect(result.get("2024Q2")?.date).toBe("2024-06-30");
    expect(result.get("2024Q3")?.date).toBe("2024-09-30");
    expect(result.get("2024Q4")?.date).toBe("2024-12-31");
  });

  it("should handle empty dataset", () => {
    const map = new Map<string, { date: string; revenue: number }>();

    const result = deduplicateByQuarter(map);

    expect(result.size).toBe(0);
  });

  it("should handle single row", () => {
    const map = new Map<string, { date: string; revenue: number }>();
    map.set("2025-06-30", { date: "2025-06-30", revenue: 480700000 });

    const result = deduplicateByQuarter(map);

    expect(result.size).toBe(1);
    expect(result.get("2025Q2")?.date).toBe("2025-06-30");
    expect(result.get("2025Q2")?.revenue).toBe(480700000);
  });

  it("should select latest date when multiple dates exist for same quarter", () => {
    const map = new Map<string, { date: string; revenue: number }>();
    // 2025Q2에 여러 날짜
    map.set("2025-06-28", { date: "2025-06-28", revenue: 425200000 });
    map.set("2025-06-29", { date: "2025-06-29", revenue: 450000000 });
    map.set("2025-06-30", { date: "2025-06-30", revenue: 480700000 });

    const result = deduplicateByQuarter(map);

    expect(result.size).toBe(1);
    expect(result.get("2025Q2")?.date).toBe("2025-06-30");
    expect(result.get("2025Q2")?.revenue).toBe(480700000);
  });

  it("should handle dates in different order", () => {
    const map = new Map<string, { date: string; revenue: number }>();
    // 날짜 순서가 섞여있어도 최신 날짜 선택
    map.set("2025-06-30", { date: "2025-06-30", revenue: 480700000 });
    map.set("2025-06-28", { date: "2025-06-28", revenue: 425200000 });
    map.set("2025-06-29", { date: "2025-06-29", revenue: 450000000 });

    const result = deduplicateByQuarter(map);

    expect(result.size).toBe(1);
    expect(result.get("2025Q2")?.date).toBe("2025-06-30");
  });

  it("should preserve all row properties", () => {
    const map = new Map<
      string,
      { date: string; revenue: number; netIncome: number; eps: number }
    >();
    map.set("2025-06-28", {
      date: "2025-06-28",
      revenue: 425200000,
      netIncome: 10000000,
      eps: 0.5,
    });
    map.set("2025-06-30", {
      date: "2025-06-30",
      revenue: 480700000,
      netIncome: 15000000,
      eps: 0.75,
    });

    const result = deduplicateByQuarter(map);

    const selected = result.get("2025Q2");
    expect(selected).toBeDefined();
    expect(selected?.date).toBe("2025-06-30");
    expect(selected?.revenue).toBe(480700000);
    expect(selected?.netIncome).toBe(15000000);
    expect(selected?.eps).toBe(0.75);
  });

  it("should skip rows with invalid date", () => {
    const map = new Map<string, { date: string; revenue: number }>();
    map.set("2025-06-30", { date: "2025-06-30", revenue: 480700000 });
    map.set("invalid", { date: "", revenue: 100000000 }); // 빈 문자열
    map.set("null-date", {
      date: null as unknown as string,
      revenue: 200000000,
    }); // null

    const result = deduplicateByQuarter(map);

    // 유효한 날짜만 처리됨
    expect(result.size).toBe(1);
    expect(result.get("2025Q2")?.date).toBe("2025-06-30");
  });

  it("should handle rows with missing date property gracefully", () => {
    const map = new Map<string, { date: string; revenue: number }>();
    map.set("2025-06-30", { date: "2025-06-30", revenue: 480700000 });
    // @ts-expect-error - 테스트를 위해 의도적으로 date 누락
    map.set("no-date", { revenue: 100000000 });

    const result = deduplicateByQuarter(map);

    // 유효한 날짜만 처리됨
    expect(result.size).toBe(1);
    expect(result.get("2025Q2")?.date).toBe("2025-06-30");
  });
});
