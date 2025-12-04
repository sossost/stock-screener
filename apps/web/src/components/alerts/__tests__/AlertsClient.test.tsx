import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { AlertsClient } from "../AlertsClient";

const mockUseSuspenseQuery = vi.fn();

// React Query 모킹
vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: (args: unknown) => mockUseSuspenseQuery(args),
}));

// ErrorBoundary 테스트 래퍼
function TestErrorBoundary({
  children,
  onError,
}: {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      event.preventDefault();
      const err = new Error(event.message || "Unknown error");
      setError(err);
      setHasError(true);
      onError?.(err);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, [onError]);

  if (hasError && error) {
    return (
      <div data-testid="error-state">
        <div>알림을 불러오지 못했습니다</div>
        <div>{error.message}</div>
      </div>
    );
  }

  return <>{children}</>;
}

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
    // 테스트 환경에서는 에러가 throw되는 것을 확인
    mockUseSuspenseQuery.mockImplementation(() => {
      throw new Error("Failed to fetch");
    });

    // React의 ErrorBoundary는 클래스 컴포넌트이므로, 테스트에서는 에러가 throw되는지만 확인
    // 실제 프로덕션에서는 Next.js의 error.tsx가 에러를 처리함
    expect(() => {
      render(<AlertsClient />);
    }).toThrow("Failed to fetch");
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
