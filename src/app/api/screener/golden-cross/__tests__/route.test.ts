import { describe, it, expect, vi, beforeEach } from "vitest";
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

describe("GET /api/screener/golden-cross", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 환경변수 설정
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    process.env.FMP_API_KEY = "test_key";
  });

  it("기본 파라미터로 요청 시 성공 응답", async () => {
    const { db } = await import("@/db/client");
    const mockRows = {
      rows: [
        {
          symbol: "AAPL",
          trade_date: "2024-01-27",
          last_close: 150.0,
          market_cap: 2800000000000,
          quarterly_data: [],
          latest_eps: 1.5,
          revenue_growth_quarters: 3,
          income_growth_quarters: 2,
          revenue_avg_growth_rate: 25.5,
          income_avg_growth_rate: 30.0,
        },
      ],
    };

    vi.mocked(db.execute).mockResolvedValue(mockRows as any);

    const url = "http://localhost:3000/api/screener/golden-cross";
    const request = new Request(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].symbol).toBe("AAPL");
    expect(data.data[0].revenue_avg_growth_rate).toBe(25.5);
    expect(data.data[0].income_avg_growth_rate).toBe(30.0);
  });

  it("revenueGrowthRate 파라미터 검증", async () => {
    const { db } = await import("@/db/client");
    const mockRows = { rows: [] };
    vi.mocked(db.execute).mockResolvedValue(mockRows as any);

    const url =
      "http://localhost:3000/api/screener/golden-cross?revenueGrowth=true&revenueGrowthRate=30";
    const request = new Request(url);

    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it("incomeGrowthRate 파라미터 검증", async () => {
    const { db } = await import("@/db/client");
    const mockRows = { rows: [] };
    vi.mocked(db.execute).mockResolvedValue(mockRows as any);

    const url =
      "http://localhost:3000/api/screener/golden-cross?incomeGrowth=true&incomeGrowthRate=40";
    const request = new Request(url);

    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it("잘못된 revenueGrowthRate 범위 검증", async () => {
    const url =
      "http://localhost:3000/api/screener/golden-cross?revenueGrowthRate=2000";
    const request = new Request(url);

    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("revenueGrowthRate must be between 0 and 1000");
  });

  it("잘못된 incomeGrowthRate 범위 검증", async () => {
    const url =
      "http://localhost:3000/api/screener/golden-cross?incomeGrowthRate=-10";
    const request = new Request(url);

    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("incomeGrowthRate must be between 0 and 1000");
  });

  it("환경변수 누락 시 에러 처리", async () => {
    delete process.env.DATABASE_URL;

    const url = "http://localhost:3000/api/screener/golden-cross";
    const request = new Request(url);

    const response = await GET(request);
    expect(response.status).toBe(500);
  });

  it("복합 필터 파라미터 처리", async () => {
    const { db } = await import("@/db/client");
    const mockRows = { rows: [] };
    vi.mocked(db.execute).mockResolvedValue(mockRows as any);

    const url =
      "http://localhost:3000/api/screener/golden-cross?revenueGrowth=true&revenueGrowthRate=30&incomeGrowth=true&incomeGrowthRate=40&revenueGrowthQuarters=4&incomeGrowthQuarters=5";
    const request = new Request(url);

    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it("revenueGrowthRate가 null일 때 연속 분기 수 필터 적용", async () => {
    const { db } = await import("@/db/client");
    const mockRows = { rows: [] };
    vi.mocked(db.execute).mockResolvedValue(mockRows as any);

    // revenueGrowthRate 파라미터 없이 revenueGrowth만 true
    const url =
      "http://localhost:3000/api/screener/golden-cross?revenueGrowth=true&revenueGrowthQuarters=3";
    const request = new Request(url);

    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it("유효하지 않은 revenueGrowthRate 값 처리 (NaN)", async () => {
    const url =
      "http://localhost:3000/api/screener/golden-cross?revenueGrowthRate=abc";
    const request = new Request(url);

    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("revenueGrowthRate must be a valid number");
  });

  it("유효하지 않은 incomeGrowthRate 값 처리 (NaN)", async () => {
    const url =
      "http://localhost:3000/api/screener/golden-cross?incomeGrowthRate=xyz";
    const request = new Request(url);

    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("incomeGrowthRate must be a valid number");
  });

  it("Infinity 값 처리", async () => {
    const url =
      "http://localhost:3000/api/screener/golden-cross?revenueGrowthRate=Infinity";
    const request = new Request(url);

    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("revenueGrowthRate must be a valid number");
  });
});

