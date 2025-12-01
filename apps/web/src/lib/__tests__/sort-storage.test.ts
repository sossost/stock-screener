import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveSortState,
  loadSortState,
  clearSortState,
  type SortState,
} from "@/utils/sort-storage";
import type { SortKey } from "@/components/screener/columns";

const STORAGE_KEY = "screener_table_sort";

describe("sort-storage", () => {
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

  describe("saveSortState", () => {
    it("should save sort state to localStorage", () => {
      const sortState: SortState = {
        key: "rs_score",
        direction: "desc",
      };

      saveSortState(sortState);

      const stored = localStorageMock.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(sortState);
    });

    it("should handle localStorage access failure gracefully", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // localStorage.setItem을 throw하도록 모킹
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      const sortState: SortState = {
        key: "market_cap",
        direction: "asc",
      };

      // 에러가 발생해도 예외를 던지지 않아야 함
      expect(() => saveSortState(sortState)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save sort state to localStorage:",
        expect.any(Error)
      );

      localStorageMock.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });

    it("should not save when window is undefined (SSR)", () => {
      const originalWindow = global.window;
      // @ts-expect-error - window를 undefined로 설정
      global.window = undefined;

      const sortState: SortState = {
        key: "symbol",
        direction: "asc",
      };

      saveSortState(sortState);

      // window가 없으면 저장하지 않음
      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();

      global.window = originalWindow;
    });
  });

  describe("loadSortState", () => {
    it("should load sort state from localStorage", () => {
      const sortState: SortState = {
        key: "pe_ratio",
        direction: "desc",
      };

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(sortState));

      const loaded = loadSortState();
      expect(loaded).toEqual(sortState);
    });

    it("should return null when localStorage is empty", () => {
      const loaded = loadSortState();
      expect(loaded).toBeNull();
    });

    it("should return null and remove invalid JSON from localStorage", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // 잘못된 JSON 저장
      localStorageMock.setItem(STORAGE_KEY, "invalid json{");

      const loaded = loadSortState();
      expect(loaded).toBeNull();
      // 잘못된 JSON은 삭제되어야 함
      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to parse sort state from localStorage:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should return null and remove invalid sort state from localStorage", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // 유효하지 않은 정렬 상태 저장 (key가 없음)
      localStorageMock.setItem(
        STORAGE_KEY,
        JSON.stringify({ direction: "asc" })
      );

      const loaded = loadSortState();
      expect(loaded).toBeNull();
      // 유효하지 않은 데이터는 삭제되어야 함
      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it("should return null and remove invalid direction from localStorage", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // 유효하지 않은 direction 저장
      localStorageMock.setItem(
        STORAGE_KEY,
        JSON.stringify({ key: "rs_score", direction: "invalid" })
      );

      const loaded = loadSortState();
      expect(loaded).toBeNull();
      // 유효하지 않은 데이터는 삭제되어야 함
      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it("should handle localStorage.getItem failure gracefully", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // localStorage.getItem을 throw하도록 모킹
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = vi.fn(() => {
        throw new Error("SecurityError");
      });

      const loaded = loadSortState();
      expect(loaded).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      localStorageMock.getItem = originalGetItem;
      consoleErrorSpy.mockRestore();
    });

    it("should return null when window is undefined (SSR)", () => {
      const originalWindow = global.window;
      // @ts-expect-error - window를 undefined로 설정
      global.window = undefined;

      const loaded = loadSortState();
      expect(loaded).toBeNull();

      global.window = originalWindow;
    });

    it("should load all valid sort keys", () => {
      const validKeys: SortKey[] = [
        "symbol",
        "sector",
        "market_cap",
        "last_close",
        "pe_ratio",
        "peg_ratio",
        "rs_score",
      ];

      for (const key of validKeys) {
        const sortState: SortState = {
          key,
          direction: "asc",
        };

        localStorageMock.setItem(STORAGE_KEY, JSON.stringify(sortState));
        const loaded = loadSortState();
        expect(loaded).toEqual(sortState);
      }
    });

    it("should load both asc and desc directions", () => {
      const directions: ("asc" | "desc")[] = ["asc", "desc"];

      for (const direction of directions) {
        const sortState: SortState = {
          key: "market_cap",
          direction,
        };

        localStorageMock.setItem(STORAGE_KEY, JSON.stringify(sortState));
        const loaded = loadSortState();
        expect(loaded).toEqual(sortState);
      }
    });
  });

  describe("clearSortState", () => {
    it("should remove sort state from localStorage", () => {
      const sortState: SortState = {
        key: "rs_score",
        direction: "desc",
      };

      localStorageMock.setItem(STORAGE_KEY, JSON.stringify(sortState));
      expect(localStorageMock.getItem(STORAGE_KEY)).toBeTruthy();

      clearSortState();

      expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
    });

    it("should handle localStorage.removeItem failure gracefully", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // localStorage.removeItem을 throw하도록 모킹
      const originalRemoveItem = localStorageMock.removeItem;
      localStorageMock.removeItem = vi.fn(() => {
        throw new Error("SecurityError");
      });

      // 에러가 발생해도 예외를 던지지 않아야 함
      expect(() => clearSortState()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to clear sort state from localStorage:",
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
      expect(() => clearSortState()).not.toThrow();

      global.window = originalWindow;
    });
  });
});
