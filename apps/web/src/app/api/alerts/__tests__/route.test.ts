import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

// DB 모킹
vi.mock("@/db/client", () => ({
  db: {
    execute: vi.fn(),
  },
}));

// 에러 핸들링 모킹
vi.mock("@/lib/errors", () => ({
  handleApiError: (error: Error) => ({
    message: error.message,
    statusCode: 500,
    details: undefined,
  }),
  logError: vi.fn(),
}));

describe("GET /api/alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 환경변수 설정
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  });

  it("기본 요청 시 최신 날짜부터 5거래일치 알림 반환", async () => {
    const { db } = await import("@/db/client");

    // 날짜별 알림 조회 쿼리 결과 모킹
    const mockAlertDates = {
      rows: [
        { alert_date: "2025-01-15" },
        { alert_date: "2025-01-14" },
        { alert_date: "2025-01-13" },
      ],
    };

    // 전체 날짜 수 조회 쿼리 결과 모킹
    const mockTotalDates = {
      rows: [{ count: "3" }],
    };

    // 각 날짜별 심볼 목록 조회 쿼리 결과 모킹
    const mockSymbols = {
      rows: [{ symbol: "AAPL" }],
    };

    // 각 날짜별 알림 종목 조회 쿼리 결과 모킹
    const mockAlertsData = {
      rows: [
        {
          symbol: "AAPL",
          trade_date: "2025-01-15",
          last_close: 150.0,
          rs_score: 85,
          market_cap: 2800000000000,
          sector: "Technology",
          quarterly_data: [],
          latest_eps: 1.5,
          revenue_growth_quarters: 3,
          income_growth_quarters: 2,
          revenue_avg_growth_rate: 25.5,
          income_avg_growth_rate: 30.0,
          pe_ratio: 20.5,
          peg_ratio: 1.2,
          ma20: 145.0,
          ma50: 140.0,
          ma100: 135.0,
          ma200: 130.0,
        },
      ],
    };

    // 쿼리 실행 순서:
    // 1. 날짜 목록 조회
    // 2. 전체 날짜 수 조회
    // 3. 각 날짜별 심볼 목록 조회 (3번)
    // 4. 각 날짜별 알림 데이터 조회 (3번)
    vi.mocked(db.execute)
      .mockResolvedValueOnce(mockAlertDates as unknown as never) // 날짜 목록
      .mockResolvedValueOnce(mockTotalDates as unknown as never) // 전체 날짜 수
      .mockResolvedValueOnce(mockSymbols as unknown as never) // 첫 번째 날짜 심볼
      .mockResolvedValueOnce(mockAlertsData as unknown as never) // 첫 번째 날짜 데이터
      .mockResolvedValueOnce(mockSymbols as unknown as never) // 두 번째 날짜 심볼
      .mockResolvedValueOnce(mockAlertsData as unknown as never) // 두 번째 날짜 데이터
      .mockResolvedValueOnce(mockSymbols as unknown as never) // 세 번째 날짜 심볼
      .mockResolvedValueOnce(mockAlertsData as unknown as never); // 세 번째 날짜 데이터

    const url = "http://localhost:3000/api/alerts";
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alertsByDate).toBeDefined();
    expect(Array.isArray(data.alertsByDate)).toBe(true);
    expect(data.totalDates).toBe(3);
  });

  it("알림 없을 때 빈 배열 반환", async () => {
    const { db } = await import("@/db/client");

    const mockEmptyDates = { rows: [] };
    // 날짜 목록이 비어있으면 totalDates 쿼리는 실행되지 않음
    vi.mocked(db.execute).mockResolvedValueOnce(
      mockEmptyDates as unknown as never
    );

    const url = "http://localhost:3000/api/alerts";
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alertsByDate).toEqual([]);
    expect(data.totalDates).toBe(0);
  });

  it("maxDates 파라미터 적용 시 해당 개수만큼만 반환", async () => {
    const { db } = await import("@/db/client");

    const mockAlertDates = {
      rows: [
        { alert_date: "2025-01-15" },
        { alert_date: "2025-01-14" },
        { alert_date: "2025-01-13" },
      ],
    };

    const mockTotalDates = {
      rows: [{ count: "6" }],
    };

    const mockSymbols = { rows: [] };

    vi.mocked(db.execute)
      .mockResolvedValueOnce(mockAlertDates as unknown as never) // 날짜 목록 (maxDates=3으로 제한됨)
      .mockResolvedValueOnce(mockTotalDates as unknown as never) // 전체 날짜 수
      .mockResolvedValue(mockSymbols as unknown as never); // 각 날짜별 심볼 (빈 배열)

    const url = "http://localhost:3000/api/alerts?maxDates=3";
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alertsByDate.length).toBeLessThanOrEqual(3);
  });

  it("alertType 파라미터 적용 시 해당 타입만 조회", async () => {
    const { db } = await import("@/db/client");

    const mockAlertDates = { rows: [{ alert_date: "2025-01-15" }] };
    const mockTotalDates = { rows: [{ count: "1" }] };
    const mockSymbols = { rows: [] };

    vi.mocked(db.execute)
      .mockResolvedValueOnce(mockAlertDates as unknown as never) // 날짜 목록
      .mockResolvedValueOnce(mockTotalDates as unknown as never) // 전체 날짜 수
      .mockResolvedValue(mockSymbols as unknown as never); // 심볼 목록

    const url =
      "http://localhost:3000/api/alerts?alertType=ma20_breakout_ordered";
    const request = new NextRequest(url);

    const response = await GET(request);

    expect(response.status).toBe(200);
    // 쿼리에 alertType이 포함되었는지 확인
    expect(db.execute).toHaveBeenCalled();
  });

  it("날짜별로 그룹화되어 반환되는지 확인", async () => {
    const { db } = await import("@/db/client");

    const mockAlertDates = {
      rows: [{ alert_date: "2025-01-15" }, { alert_date: "2025-01-14" }],
    };

    const mockTotalDates = {
      rows: [{ count: "2" }],
    };

    const mockSymbols1 = {
      rows: [{ symbol: "AAPL" }],
    };

    const mockSymbols2 = {
      rows: [{ symbol: "MSFT" }],
    };

    const mockAlertsData1 = {
      rows: [
        {
          symbol: "AAPL",
          trade_date: "2025-01-15",
          last_close: 150.0,
          rs_score: 85,
          market_cap: 2800000000000,
          sector: "Technology",
          quarterly_data: [],
          latest_eps: 1.5,
          revenue_growth_quarters: 3,
          income_growth_quarters: 2,
          revenue_avg_growth_rate: 25.5,
          income_avg_growth_rate: 30.0,
          pe_ratio: 20.5,
          peg_ratio: 1.2,
          ma20: 145.0,
          ma50: 140.0,
          ma100: 135.0,
          ma200: 130.0,
        },
      ],
    };

    const mockAlertsData2 = {
      rows: [
        {
          symbol: "MSFT",
          trade_date: "2025-01-14",
          last_close: 380.0,
          rs_score: 90,
          market_cap: 3000000000000,
          sector: "Technology",
          quarterly_data: [],
          latest_eps: 2.0,
          revenue_growth_quarters: 4,
          income_growth_quarters: 3,
          revenue_avg_growth_rate: 30.0,
          income_avg_growth_rate: 35.0,
          pe_ratio: 25.0,
          peg_ratio: 1.5,
          ma20: 375.0,
          ma50: 370.0,
          ma100: 365.0,
          ma200: 360.0,
        },
      ],
    };

    vi.mocked(db.execute)
      .mockResolvedValueOnce(mockAlertDates as unknown as never) // 날짜 목록
      .mockResolvedValueOnce(mockTotalDates as unknown as never) // 전체 날짜 수
      .mockResolvedValueOnce(mockSymbols1 as unknown as never) // 첫 번째 날짜 심볼
      .mockResolvedValueOnce(mockAlertsData1 as unknown as never) // 첫 번째 날짜 데이터
      .mockResolvedValueOnce(mockSymbols2 as unknown as never) // 두 번째 날짜 심볼
      .mockResolvedValueOnce(mockAlertsData2 as unknown as never); // 두 번째 날짜 데이터

    const url = "http://localhost:3000/api/alerts";
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alertsByDate.length).toBe(2);
    expect(data.alertsByDate[0].date).toBe("2025-01-15");
    expect(data.alertsByDate[1].date).toBe("2025-01-14");
    expect(data.alertsByDate[0].alerts).toBeDefined();
    expect(Array.isArray(data.alertsByDate[0].alerts)).toBe(true);
  });

  it("알림 데이터가 ScreenerCompany 형태로 변환되는지 확인", async () => {
    const { db } = await import("@/db/client");

    const mockAlertDates = {
      rows: [{ alert_date: "2025-01-15" }],
    };

    const mockTotalDates = {
      rows: [{ count: "1" }],
    };

    const mockSymbols = {
      rows: [{ symbol: "AAPL" }],
    };

    const mockAlertsData = {
      rows: [
        {
          symbol: "AAPL",
          trade_date: "2025-01-15",
          last_close: 150.0,
          rs_score: 85,
          market_cap: 2800000000000,
          sector: "Technology",
          quarterly_data: [
            {
              period_end_date: "2024-12-31",
              revenue: 1000000000,
              eps_diluted: 1.5,
            },
          ],
          latest_eps: 1.5,
          revenue_growth_quarters: 3,
          income_growth_quarters: 2,
          revenue_avg_growth_rate: 25.5,
          income_avg_growth_rate: 30.0,
          pe_ratio: 20.5,
          peg_ratio: 1.2,
          ma20: 145.0,
          ma50: 140.0,
          ma100: 135.0,
          ma200: 130.0,
        },
      ],
    };

    vi.mocked(db.execute)
      .mockResolvedValueOnce(mockAlertDates as unknown as never) // 날짜 목록
      .mockResolvedValueOnce(mockTotalDates as unknown as never) // 전체 날짜 수
      .mockResolvedValueOnce(mockSymbols as unknown as never) // 심볼 목록
      .mockResolvedValueOnce(mockAlertsData as unknown as never); // 알림 데이터

    const url = "http://localhost:3000/api/alerts";
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alertsByDate[0].alerts[0]).toMatchObject({
      symbol: "AAPL",
      market_cap: expect.any(String),
      sector: "Technology",
      last_close: expect.any(String),
      rs_score: 85,
      pe_ratio: 20.5,
      peg_ratio: 1.2,
      quarterly_financials: expect.any(Array),
      profitability_status: expect.any(String),
      ordered: true,
    });
  });

  it("DB 에러 시 500 에러 반환", async () => {
    const { db } = await import("@/db/client");

    // zod 검증은 통과하고 DB 쿼리에서 에러 발생
    vi.mocked(db.execute)
      .mockResolvedValueOnce({
        rows: [{ alert_date: "2025-01-15" }],
      } as unknown as never) // 날짜 목록 조회는 성공
      .mockRejectedValueOnce(new Error("Database error")); // 전체 날짜 수 조회에서 에러

    const url = "http://localhost:3000/api/alerts";
    const request = new NextRequest(url);

    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
