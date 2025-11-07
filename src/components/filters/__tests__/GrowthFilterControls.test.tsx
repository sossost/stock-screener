import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GrowthFilterControls } from "../GrowthFilterControls";

describe("GrowthFilterControls", () => {
  const defaultProps = {
    revenueGrowth: false,
    setRevenueGrowth: vi.fn(),
    revenueGrowthQuarters: 3,
    setRevenueGrowthQuarters: vi.fn(),
    revenueGrowthRate: null,
    setRevenueGrowthRate: vi.fn(),
    incomeGrowth: false,
    setIncomeGrowth: vi.fn(),
    incomeGrowthQuarters: 3,
    setIncomeGrowthQuarters: vi.fn(),
    incomeGrowthRate: null,
    setIncomeGrowthRate: vi.fn(),
  };

  it("렌더링 확인", () => {
    render(<GrowthFilterControls {...defaultProps} />);
    expect(screen.getByLabelText("매출 성장")).toBeInTheDocument();
    expect(screen.getByLabelText("수익 성장")).toBeInTheDocument();
  });

  it("필터 비활성화 시 입력 필드 비활성화", () => {
    render(<GrowthFilterControls {...defaultProps} />);

    const revenueQuartersInput = screen.getAllByPlaceholderText("3")[0];
    const revenueRateInput = screen.getAllByPlaceholderText("30")[0];

    expect(revenueQuartersInput).toBeDisabled();
    expect(revenueRateInput).toBeDisabled();
  });

  it("필터 활성화 시 입력 필드 활성화", () => {
    render(
      <GrowthFilterControls
        {...defaultProps}
        revenueGrowth={true}
        incomeGrowth={true}
      />
    );

    const revenueQuartersInput = screen.getAllByPlaceholderText("3")[0];
    const revenueRateInput = screen.getAllByPlaceholderText("30")[0];

    expect(revenueQuartersInput).not.toBeDisabled();
    expect(revenueRateInput).not.toBeDisabled();
  });

  it("매출 성장 필터 체크박스 토글", () => {
    const setRevenueGrowth = vi.fn();
    render(
      <GrowthFilterControls
        {...defaultProps}
        setRevenueGrowth={setRevenueGrowth}
      />
    );

    const checkbox = screen.getByLabelText("매출 성장");
    fireEvent.click(checkbox);

    expect(setRevenueGrowth).toHaveBeenCalledWith(true);
  });

  it("분기 수 입력 및 확인", async () => {
    const setRevenueGrowthQuarters = vi.fn();
    render(
      <GrowthFilterControls
        {...defaultProps}
        revenueGrowth={true}
        setRevenueGrowthQuarters={setRevenueGrowthQuarters}
      />
    );

    const quartersInput = screen.getAllByPlaceholderText("3")[0];
    fireEvent.change(quartersInput, { target: { value: "4" } });
    fireEvent.blur(quartersInput);

    await waitFor(() => {
      expect(setRevenueGrowthQuarters).toHaveBeenCalledWith(4);
    });
  });

  it("성장률 입력 및 확인", async () => {
    const setRevenueGrowthRate = vi.fn();
    render(
      <GrowthFilterControls
        {...defaultProps}
        revenueGrowth={true}
        setRevenueGrowthRate={setRevenueGrowthRate}
      />
    );

    const rateInput = screen.getAllByPlaceholderText("30")[0];
    fireEvent.change(rateInput, { target: { value: "50" } });
    fireEvent.blur(rateInput);

    await waitFor(() => {
      expect(setRevenueGrowthRate).toHaveBeenCalledWith(50);
    });
  });

  it("Enter 키로 분기 수 확인", async () => {
    const setRevenueGrowthQuarters = vi.fn();
    render(
      <GrowthFilterControls
        {...defaultProps}
        revenueGrowth={true}
        setRevenueGrowthQuarters={setRevenueGrowthQuarters}
      />
    );

    const quartersInput = screen.getAllByPlaceholderText("3")[0];
    fireEvent.change(quartersInput, { target: { value: "5" } });
    fireEvent.keyDown(quartersInput, { key: "Enter" });

    await waitFor(() => {
      expect(setRevenueGrowthQuarters).toHaveBeenCalledWith(5);
    });
  });

  it("Enter 키로 성장률 확인", async () => {
    const setRevenueGrowthRate = vi.fn();
    render(
      <GrowthFilterControls
        {...defaultProps}
        revenueGrowth={true}
        setRevenueGrowthRate={setRevenueGrowthRate}
      />
    );

    const rateInput = screen.getAllByPlaceholderText("30")[0];
    fireEvent.change(rateInput, { target: { value: "40" } });
    fireEvent.keyDown(rateInput, { key: "Enter" });

    await waitFor(() => {
      expect(setRevenueGrowthRate).toHaveBeenCalledWith(40);
    });
  });

  it("잘못된 분기 수 입력 시 기본값 복원", async () => {
    const setRevenueGrowthQuarters = vi.fn();
    render(
      <GrowthFilterControls
        {...defaultProps}
        revenueGrowth={true}
        revenueGrowthQuarters={3}
        setRevenueGrowthQuarters={setRevenueGrowthQuarters}
      />
    );

    const quartersInput = screen.getAllByPlaceholderText("3")[0];
    fireEvent.change(quartersInput, { target: { value: "10" } }); // 범위 초과
    fireEvent.blur(quartersInput);

    // 유효하지 않은 값이면 setter가 호출되지 않고 기본값으로 복원
    await waitFor(() => {
      expect(quartersInput).toHaveValue(3);
    });
    // setter가 호출되지 않았는지 확인
    expect(setRevenueGrowthQuarters).not.toHaveBeenCalled();
  });

  it("잘못된 성장률 입력 시 기본값 복원", async () => {
    const setRevenueGrowthRate = vi.fn();
    render(
      <GrowthFilterControls
        {...defaultProps}
        revenueGrowth={true}
        revenueGrowthRate={30}
        setRevenueGrowthRate={setRevenueGrowthRate}
      />
    );

    const rateInput = screen.getAllByPlaceholderText("30")[0];
    fireEvent.change(rateInput, { target: { value: "2000" } }); // 범위 초과
    fireEvent.blur(rateInput);

    await waitFor(() => {
      expect(rateInput).toHaveValue(30);
    });
    // 유효하지 않은 값이면 기본값으로 복원되므로 setter가 호출되지 않음
    // (컴포넌트 로직상 기본값으로 복원만 하고 setter는 호출하지 않음)
  });

  it("성장률 빈 값 입력 시 null 설정", async () => {
    const setRevenueGrowthRate = vi.fn();
    render(
      <GrowthFilterControls
        {...defaultProps}
        revenueGrowth={true}
        revenueGrowthRate={30}
        setRevenueGrowthRate={setRevenueGrowthRate}
      />
    );

    const rateInput = screen.getAllByPlaceholderText("30")[0];
    fireEvent.change(rateInput, { target: { value: "" } });
    fireEvent.blur(rateInput);

    await waitFor(() => {
      expect(setRevenueGrowthRate).toHaveBeenCalledWith(null);
    });
  });

  it("수익 성장 필터도 동일하게 동작", async () => {
    const setIncomeGrowth = vi.fn();
    const setIncomeGrowthQuarters = vi.fn();
    const setIncomeGrowthRate = vi.fn();

    render(
      <GrowthFilterControls
        {...defaultProps}
        setIncomeGrowth={setIncomeGrowth}
        setIncomeGrowthQuarters={setIncomeGrowthQuarters}
        setIncomeGrowthRate={setIncomeGrowthRate}
      />
    );

    const checkbox = screen.getByLabelText("수익 성장");
    fireEvent.click(checkbox);

    expect(setIncomeGrowth).toHaveBeenCalledWith(true);
  });
});

