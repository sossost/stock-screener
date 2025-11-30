import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveDefaultFilters,
  loadDefaultFilters,
  clearDefaultFilters,
  mergeFilters,
} from "@/utils/filter-storage";
import type { FilterState } from "@/lib/filters/summary";
import { filterDefaults } from "@/lib/filters/schema";

const STORAGE_KEY = "screener_default_filters";

describe("filter-storage", () => {
  // localStorage 모킹
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    // 각 테스트 전에 localStorage 초기화
    localStorageMock.clear();
    // window.localStorage를 모킹
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  describe("saveDefaultFilters", () => {
    it("should save filter state to localStorage", () => {
      const filterState: FilterState = {
        ordered: true,
        goldenCross: true,
        profitability: "profitable",
      };

      saveDefaultFilters(filterState);

      const stored = localStorageMock.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(filterState);
    });

    it("should handle localStorage access failure gracefully", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      // localStorage.setItem을 throw하도록 모킹
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      const filterState: FilterState = {
        ordered: true,
      };

      // 에러가 발생해도 예외를 던지지 않아야 함
      expect(() => saveDefaultFilters(filterState)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save filters to localStorage:",
        expect.any(Error)
      );

      localStorageMock.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });

    it("should not save when window is undefined (SSR)", () => {
      const originalWindow = global.window;
      // @ts-expect-error - window를 undefined로 설정
      global.window = undefined;

      const filterState: FilterState = {
        ordered: true,
      };

      saveDefaultFilters(filterState);

      // window가 없으면 저장하지 않음
      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();

      global.window = originalWindow;
    });
  });

  describe("loadDefaultFilters", () => {
    it("should load filter state from localStorage", () => {
      const filterState: FilterState = {
        ordered: true,
        goldenCross: true,
        profitability: "profitable",
      };

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(filterState));

      const loaded = loadDefaultFilters();
      expect(loaded).toEqual(filterState);
    });

    it("should return null when localStorage is empty", () => {
      const loaded = loadDefaultFilters();
      expect(loaded).toBeNull();
    });

    it("should return null and remove invalid JSON from localStorage", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      // 잘못된 JSON 저장
      localStorageMock.setItem(STORAGE_KEY, "invalid json{");

      const loaded = loadDefaultFilters();
      expect(loaded).toBeNull();
      // 잘못된 JSON은 삭제되어야 함
      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to parse filters from localStorage:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle localStorage.getItem failure gracefully", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      // localStorage.getItem을 throw하도록 모킹
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = vi.fn(() => {
        throw new Error("SecurityError");
      });

      const loaded = loadDefaultFilters();
      expect(loaded).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      localStorageMock.getItem = originalGetItem;
      consoleErrorSpy.mockRestore();
    });

    it("should return null when window is undefined (SSR)", () => {
      const originalWindow = global.window;
      // @ts-expect-error - window를 undefined로 설정
      global.window = undefined;

      const loaded = loadDefaultFilters();
      expect(loaded).toBeNull();

      global.window = originalWindow;
    });
  });

  describe("clearDefaultFilters", () => {
    it("should remove filter state from localStorage", () => {
      const filterState: FilterState = {
        ordered: true,
      };

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(filterState));
      expect(localStorageMock.getItem(STORAGE_KEY)).toBeTruthy();

      clearDefaultFilters();

      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
    });

    it("should handle localStorage.removeItem failure gracefully", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      // localStorage.removeItem을 throw하도록 모킹
      const originalRemoveItem = localStorageMock.removeItem;
      localStorageMock.removeItem = vi.fn(() => {
        throw new Error("SecurityError");
      });

      // 에러가 발생해도 예외를 던지지 않아야 함
      expect(() => clearDefaultFilters()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to clear filters from localStorage:",
        expect.any(Error)
      );

      localStorageMock.removeItem = originalRemoveItem;
      consoleErrorSpy.mockRestore();
    });

    it("should not clear when window is undefined (SSR)", () => {
      const originalWindow = global.window;
      // @ts-expect-error - window를 undefined로 설정
      global.window = undefined;

      // window가 없어도 예외를 던지지 않아야 함
      expect(() => clearDefaultFilters()).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe("mergeFilters", () => {
    it("should merge default filters with URL filters", () => {
      const defaultFilters: Partial<FilterState> = {
        ordered: true,
        goldenCross: true,
        profitability: "profitable",
      };

      const urlFilters: Partial<FilterState> = {
        ordered: false,
        ma20Above: true,
      };

      const merged = mergeFilters(defaultFilters, urlFilters);

      // URL 필터가 우선순위를 가짐
      expect(merged.ordered).toBe(false); // URL 필터 값
      expect(merged.goldenCross).toBe(true); // 기본 필터 값
      expect(merged.profitability).toBe("profitable"); // 기본 필터 값
      expect(merged.ma20Above).toBe(true); // URL 필터 값
    });

    it("should use filterDefaults when defaultFilters is null", () => {
      const urlFilters: Partial<FilterState> = {
        ordered: true,
        ma20Above: true,
      };

      const merged = mergeFilters(null, urlFilters);

      // filterDefaults와 URL 필터가 병합됨
      expect(merged.ordered).toBe(true); // URL 필터 값
      expect(merged.ma20Above).toBe(true); // URL 필터 값
      expect(merged.profitability).toBe(filterDefaults.profitability); // filterDefaults 값
      expect(merged.lookbackDays).toBe(filterDefaults.lookbackDays); // filterDefaults 값
    });

    it("should use filterDefaults when defaultFilters is empty", () => {
      const urlFilters: Partial<FilterState> = {
        ordered: true,
      };

      const merged = mergeFilters({}, urlFilters);

      expect(merged.ordered).toBe(true); // URL 필터 값
      expect(merged.profitability).toBe(filterDefaults.profitability); // filterDefaults 값
    });

    it("should prioritize URL filters over default filters", () => {
      const defaultFilters: Partial<FilterState> = {
        ordered: true,
        goldenCross: true,
        profitability: "profitable",
      };

      const urlFilters: Partial<FilterState> = {
        ordered: false,
        profitability: "unprofitable",
      };

      const merged = mergeFilters(defaultFilters, urlFilters);

      // URL 필터가 우선
      expect(merged.ordered).toBe(false);
      expect(merged.profitability).toBe("unprofitable");
      // URL에 없는 필터는 기본값 유지
      expect(merged.goldenCross).toBe(true);
    });

    it("should return complete FilterState with all defaults", () => {
      const urlFilters: Partial<FilterState> = {
        ordered: true,
      };

      const merged = mergeFilters(null, urlFilters);

      // 모든 필터 속성이 있어야 함
      expect(merged).toHaveProperty("ordered");
      expect(merged).toHaveProperty("goldenCross");
      expect(merged).toHaveProperty("profitability");
      expect(merged).toHaveProperty("lookbackDays");
      expect(merged).toHaveProperty("turnAround");
      expect(merged).toHaveProperty("revenueGrowth");
      expect(merged).toHaveProperty("incomeGrowth");
      expect(merged).toHaveProperty("pegFilter");
      expect(merged).toHaveProperty("ma20Above");
      expect(merged).toHaveProperty("ma50Above");
      expect(merged).toHaveProperty("ma100Above");
      expect(merged).toHaveProperty("ma200Above");
    });
  });
});

