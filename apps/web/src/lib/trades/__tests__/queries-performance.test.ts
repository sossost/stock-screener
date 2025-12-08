import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTradesList } from "../queries";
import type { TradeStatus } from "../types";

// DB 모킹
vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(),
    execute: vi.fn(),
  },
}));

// 인증 모킹
vi.mock("@/lib/auth/user", () => ({
  getUserIdFromCookies: vi.fn(() => Promise.resolve("test-user-id")),
}));

describe("getTradesList - 쿼리 최적화", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { db } = await import("@/db/client");
    vi.mocked(db.select).mockReset();
    vi.mocked(db.execute).mockReset();
  });

  it("윈도우 함수를 사용하여 최신 가격과 전일 가격을 한 번의 쿼리로 조회", async () => {
    const { db } = await import("@/db/client");

    // trades 조회 결과 모킹 (첫 번째 select)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() =>
              Promise.resolve([
                {
                  trade: {
                    id: 1,
                    userId: "test-user-id",
                    symbol: "AAPL",
                    status: "OPEN" as TradeStatus,
                    startDate: new Date("2025-01-01"),
                    endDate: null,
                    planStopLoss: null,
                    commissionRate: "0.0007",
                    createdAt: new Date(),
                  },
                  companyName: "Apple Inc.",
                },
              ])
            ),
          })),
        })),
      })),
    });

    // tradeActions 조회 결과 모킹 (두 번째 select)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() =>
            Promise.resolve([
              {
                id: 1,
                tradeId: 1,
                actionType: "BUY",
                actionDate: new Date("2025-01-01"),
                price: "150.00",
                quantity: 10,
                note: null,
                createdAt: new Date(),
              },
            ])
          ),
        })),
      })),
    });

    // 가격 조회 쿼리 결과 모킹 (윈도우 함수 사용, execute로 통합)

    // 가격 조회 쿼리 결과 모킹 (윈도우 함수 사용)
    const mockPriceData = {
      rows: [
        {
          symbol: "AAPL",
          latest_close: "155.00",
          latest_date: "2025-01-15",
          prev_close: "150.00",
        },
      ],
    };

    vi.mocked(db.execute).mockResolvedValue(mockPriceData as never);

    const result = await getTradesList("OPEN");

    // 결과 검증
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe("AAPL");
    expect(result[0].currentPrice).toBe(155.0);
    expect(result[0].priceChangePercent).toBeCloseTo(3.33, 2); // (155 - 150) / 150 * 100

    // 윈도우 함수를 사용한 쿼리가 실행되었는지 확인
    expect(db.execute).toHaveBeenCalled();
    const executeCall = vi.mocked(db.execute).mock.calls[0];
    const sqlString = JSON.stringify(executeCall[0]);
    expect(sqlString).toContain("ROW_NUMBER()");
    expect(sqlString).toContain("PARTITION BY symbol");
    expect(sqlString).toContain("ORDER BY date DESC");
  });

  it("전일 가격이 없을 때 priceChangePercent가 null", async () => {
    const { db } = await import("@/db/client");

    // trades 조회 결과 모킹 (첫 번째 select)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() =>
              Promise.resolve([
                {
                  trade: {
                    id: 1,
                    userId: "test-user-id",
                    symbol: "AAPL",
                    status: "OPEN" as TradeStatus,
                    startDate: new Date("2025-01-01"),
                    endDate: null,
                    planStopLoss: null,
                    commissionRate: "0.0007",
                    createdAt: new Date(),
                  },
                  companyName: "Apple Inc.",
                },
              ])
            ),
          })),
        })),
      })),
    });

    // tradeActions 조회 결과 모킹 (두 번째 select)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve([])),
        })),
      })),
    });

    // 가격 조회 쿼리 결과 모킹 (윈도우 함수 사용, execute로 통합, 전일 가격 없음)
    const mockPriceData = {
      rows: [
        {
          symbol: "AAPL",
          latest_close: "155.00",
          latest_date: "2025-01-15",
          prev_close: null, // 전일 가격 없음
        },
      ],
    };

    vi.mocked(db.execute).mockResolvedValue(mockPriceData as never);

    const result = await getTradesList("OPEN");

    // 결과 검증
    expect(result).toHaveLength(1);
    expect(result[0].currentPrice).toBe(155.0);
    expect(result[0].priceChangePercent).toBeNull();
  });

  it("빈 심볼 리스트일 때 빈 배열 반환", async () => {
    const { db } = await import("@/db/client");

    // trades 조회 결과 모킹 (빈 배열)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    });

    const result = await getTradesList("OPEN");

    // 결과 검증
    expect(result).toHaveLength(0);
    // 가격 조회 쿼리가 실행되지 않아야 함
    expect(db.execute).not.toHaveBeenCalled();
  });
});
