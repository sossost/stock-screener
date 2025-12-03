import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlertTableGroup } from "../AlertTableGroup";
import type { ScreenerCompany } from "@/types/screener";

// StockTable 모킹
vi.mock("@/components/screener/StockTable", () => ({
  StockTable: ({ data }: { data: ScreenerCompany[] }) => (
    <div data-testid="stock-table">
      {data.map((item) => (
        <div key={item.symbol}>{item.symbol}</div>
      ))}
    </div>
  ),
}));

describe("AlertTableGroup", () => {
  const mockAlertType = "ma20_breakout_ordered";
  const mockAlertsByDate = [
    {
      date: "2025-01-15",
      alertType: mockAlertType,
      alerts: [
        {
          symbol: "AAPL",
          market_cap: "2800000000000",
          sector: "Technology",
          last_close: "150.0",
          rs_score: 85,
          pe_ratio: 20.5,
          peg_ratio: 1.2,
          quarterly_financials: [],
          profitability_status: "profitable" as const,
          revenue_growth_quarters: 3,
          income_growth_quarters: 2,
          revenue_avg_growth_rate: 25.5,
          income_avg_growth_rate: 30.0,
          ordered: true,
          just_turned: false,
        },
        {
          symbol: "MSFT",
          market_cap: "3000000000000",
          sector: "Technology",
          last_close: "380.0",
          rs_score: 90,
          pe_ratio: 25.0,
          peg_ratio: 1.5,
          quarterly_financials: [],
          profitability_status: "profitable" as const,
          revenue_growth_quarters: 4,
          income_growth_quarters: 3,
          revenue_avg_growth_rate: 30.0,
          income_avg_growth_rate: 35.0,
          ordered: true,
          just_turned: false,
        },
      ] as ScreenerCompany[],
    },
    {
      date: "2025-01-14",
      alertType: mockAlertType,
      alerts: [
        {
          symbol: "GOOGL",
          market_cap: "2000000000000",
          sector: "Technology",
          last_close: "140.0",
          rs_score: 80,
          pe_ratio: 22.0,
          peg_ratio: 1.3,
          quarterly_financials: [],
          profitability_status: "profitable" as const,
          revenue_growth_quarters: 2,
          income_growth_quarters: 1,
          revenue_avg_growth_rate: 20.0,
          income_avg_growth_rate: 25.0,
          ordered: true,
          just_turned: false,
        },
      ] as ScreenerCompany[],
    },
  ];

  it("날짜별로 테이블을 세로로 배치하여 표시", () => {
    render(<AlertTableGroup alertsByDate={mockAlertsByDate} />);

    // 날짜 헤더 확인
    expect(screen.getByText(/2025-01-15/)).toBeInTheDocument();
    expect(screen.getByText(/2025-01-14/)).toBeInTheDocument();

    // 각 날짜별 StockTable 컴포넌트 확인
    const tables = screen.getAllByTestId("stock-table");
    expect(tables).toHaveLength(2);
  });

  it("날짜 헤더에 요일 표시", () => {
    render(<AlertTableGroup alertsByDate={mockAlertsByDate} />);

    // 날짜와 요일이 함께 표시되는지 확인
    const dateHeaders = screen.getAllByText(/2025-01-15|2025-01-14/);
    expect(dateHeaders.length).toBeGreaterThan(0);
  });

  it("각 날짜별 알림 종목이 StockTable에 전달되는지 확인", () => {
    render(<AlertTableGroup alertsByDate={mockAlertsByDate} />);

    // 첫 번째 날짜의 종목들
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();

    // 두 번째 날짜의 종목
    expect(screen.getByText("GOOGL")).toBeInTheDocument();
  });

  it("빈 배열일 때 아무것도 렌더링하지 않음", () => {
    const { container } = render(<AlertTableGroup alertsByDate={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("날짜 순서가 최신 날짜부터 표시되는지 확인", () => {
    render(<AlertTableGroup alertsByDate={mockAlertsByDate} />);

    const dateHeaders = screen.getAllByText(/2025-01-\d{2}/);
    // 첫 번째가 최신 날짜인지 확인
    expect(dateHeaders[0]).toHaveTextContent("2025-01-15");
  });
});
