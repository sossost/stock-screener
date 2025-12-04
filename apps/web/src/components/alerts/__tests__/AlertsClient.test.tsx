import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AlertsClient } from "../AlertsClient";

const mockUseSuspenseQuery = vi.fn();

// React Query 모킹
vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: (args: unknown) => mockUseSuspenseQuery(args),
}));

// AlertTableGroup 모킹
vi.mock("../AlertTableGroup", () => ({
  AlertTableGroup: ({
    alertsByDate,
  }: {
    alertsByDate: Array<{ date: string; alerts: unknown[] }>;
  }) => (
    <div data-testid="alert-table-group">
      {alertsByDate.map((item) => (
        <div key={item.date}>{item.date}</div>
      ))}
    </div>
  ),
}));

// TableSkeleton 모킹
vi.mock("@/app/(screener)/TableSkeleton", () => ({
  TableSkeleton: () => <div data-testid="table-skeleton">Loading...</div>,
}));

describe("AlertsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("알림 데이터가 있을 때 AlertTableGroup 렌더링", async () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: {
        alertsByDate: [
          {
            date: "2025-01-15",
            alerts: [],
          },
        ],
        totalDates: 1,
      },
      error: undefined,
    });

    render(<AlertsClient />);

    await waitFor(() => {
      expect(screen.getByTestId("alert-table-group")).toBeInTheDocument();
    });
  });

  it("알림이 없을 때 빈 상태 표시", async () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: {
        alertsByDate: [],
        totalDates: 0,
      },
      error: undefined,
    });

    render(<AlertsClient />);

    await waitFor(() => {
      expect(screen.getByText("알림이 없습니다")).toBeInTheDocument();
      expect(screen.queryByTestId("alert-table-group")).not.toBeInTheDocument();
    });
  });

  it("에러 발생 시 에러 메시지 표시", async () => {
    // useSuspenseQuery는 에러를 throw하므로, 에러 바운더리로 처리됨
    // 테스트에서는 에러를 throw하도록 모킹
    mockUseSuspenseQuery.mockImplementation(() => {
      throw new Error("Failed to fetch");
    });

    // 에러 바운더리 없이 렌더링하면 에러가 throw됨
    // 실제로는 에러 바운더리가 에러를 처리하므로, 여기서는 에러가 throw되는지만 확인
    expect(() => render(<AlertsClient />)).toThrow("Failed to fetch");
  });

  it("데이터가 null일 때 빈 상태 표시", async () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: null,
      error: undefined,
    });

    render(<AlertsClient />);

    await waitFor(() => {
      expect(screen.getByText("알림이 없습니다")).toBeInTheDocument();
    });
  });
});
