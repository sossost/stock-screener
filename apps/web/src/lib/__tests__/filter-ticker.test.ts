import { describe, it, expect } from "vitest";
import { filterTickers, filterTickerData } from "../filters/ticker";

describe("filterTickers", () => {
  const symbols = ["AAPL", "NVDA", "NVDL", "MSFT", "GOOGL", "AMZN"];

  it("should return all symbols when search query is empty", () => {
    expect(filterTickers(symbols, "")).toEqual(symbols);
    expect(filterTickers(symbols, "   ")).toEqual(symbols);
  });

  it("should filter symbols by partial match (case insensitive)", () => {
    expect(filterTickers(symbols, "NV")).toEqual(["NVDA", "NVDL"]);
    expect(filterTickers(symbols, "nv")).toEqual(["NVDA", "NVDL"]);
    expect(filterTickers(symbols, "Nv")).toEqual(["NVDA", "NVDL"]);
  });

  it("should filter symbols by exact match (case insensitive)", () => {
    expect(filterTickers(symbols, "AAPL")).toEqual(["AAPL"]);
    expect(filterTickers(symbols, "aapl")).toEqual(["AAPL"]);
  });

  it("should return empty array when no match found", () => {
    expect(filterTickers(symbols, "XYZ")).toEqual([]);
  });

  it("should handle single character search", () => {
    expect(filterTickers(symbols, "A")).toEqual(["AAPL", "NVDA", "AMZN"]);
  });
});

describe("filterTickerData", () => {
  const data = [
    { symbol: "AAPL", name: "Apple Inc." },
    { symbol: "NVDA", name: "NVIDIA Corporation" },
    { symbol: "NVDL", name: "NVDL ETF" },
    { symbol: "MSFT", name: "Microsoft Corporation" },
  ];

  it("should return all data when search query is empty", () => {
    expect(filterTickerData(data, "")).toEqual(data);
    expect(filterTickerData(data, "   ")).toEqual(data);
  });

  it("should filter data by symbol partial match (case insensitive)", () => {
    expect(filterTickerData(data, "NV")).toEqual([
      { symbol: "NVDA", name: "NVIDIA Corporation" },
      { symbol: "NVDL", name: "NVDL ETF" },
    ]);
    expect(filterTickerData(data, "nv")).toEqual([
      { symbol: "NVDA", name: "NVIDIA Corporation" },
      { symbol: "NVDL", name: "NVDL ETF" },
    ]);
  });

  it("should filter data by exact symbol match (case insensitive)", () => {
    expect(filterTickerData(data, "AAPL")).toEqual([
      { symbol: "AAPL", name: "Apple Inc." },
    ]);
    expect(filterTickerData(data, "aapl")).toEqual([
      { symbol: "AAPL", name: "Apple Inc." },
    ]);
  });

  it("should return empty array when no match found", () => {
    expect(filterTickerData(data, "XYZ")).toEqual([]);
  });

  it("should preserve all properties of filtered items", () => {
    const result = filterTickerData(data, "NVDA");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      symbol: "NVDA",
      name: "NVIDIA Corporation",
    });
  });
});
