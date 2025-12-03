import { describe, it, expect } from "vitest";
import { calculateCashChange, DEFAULT_COMMISSION_RATE } from "../calculations";
import { TradeAction } from "../types";

describe("calculateCashChange", () => {
  const commissionRate = DEFAULT_COMMISSION_RATE; // 0.07%

  it("매수 액션 시 현금 감소 계산", () => {
    const actions: TradeAction[] = [
      {
        id: 1,
        tradeId: 1,
        actionType: "BUY",
        actionDate: new Date("2025-01-01"),
        price: "100.00",
        quantity: 10,
        note: null,
        createdAt: new Date(),
      },
    ];

    const cashChange = calculateCashChange(actions, commissionRate);
    // 매수: -(100 * 10 * (1 + 0.0007)) = -1000.7
    expect(cashChange).toBeCloseTo(-1000.7, 2);
  });

  it("매도 액션 시 현금 증가 계산", () => {
    const actions: TradeAction[] = [
      {
        id: 1,
        tradeId: 1,
        actionType: "SELL",
        actionDate: new Date("2025-01-01"),
        price: "110.00",
        quantity: 5,
        note: null,
        createdAt: new Date(),
      },
    ];

    const cashChange = calculateCashChange(actions, commissionRate);
    // 매도: +(110 * 5 * (1 - 0.0007)) = +549.615
    expect(cashChange).toBeCloseTo(549.615, 2);
  });

  it("매수와 매도 혼합 시 순 현금 변화 계산", () => {
    const actions: TradeAction[] = [
      {
        id: 1,
        tradeId: 1,
        actionType: "BUY",
        actionDate: new Date("2025-01-01"),
        price: "100.00",
        quantity: 10,
        note: null,
        createdAt: new Date(),
      },
      {
        id: 2,
        tradeId: 1,
        actionType: "SELL",
        actionDate: new Date("2025-01-02"),
        price: "110.00",
        quantity: 5,
        note: null,
        createdAt: new Date(),
      },
    ];

    const cashChange = calculateCashChange(actions, commissionRate);
    // 매수: -1000.7, 매도: +549.615, 합계: -451.085
    expect(cashChange).toBeCloseTo(-451.085, 2);
  });

  it("빈 액션 배열 시 0 반환", () => {
    const actions: TradeAction[] = [];
    const cashChange = calculateCashChange(actions, commissionRate);
    expect(cashChange).toBe(0);
  });

  it("수수료율 0일 때 계산", () => {
    const actions: TradeAction[] = [
      {
        id: 1,
        tradeId: 1,
        actionType: "BUY",
        actionDate: new Date("2025-01-01"),
        price: "100.00",
        quantity: 10,
        note: null,
        createdAt: new Date(),
      },
    ];

    const cashChange = calculateCashChange(actions, 0);
    // 매수: -(100 * 10 * (1 + 0)) = -1000
    expect(cashChange).toBe(-1000);
  });

  it("여러 매수 액션 시 누적 계산", () => {
    const actions: TradeAction[] = [
      {
        id: 1,
        tradeId: 1,
        actionType: "BUY",
        actionDate: new Date("2025-01-01"),
        price: "100.00",
        quantity: 10,
        note: null,
        createdAt: new Date(),
      },
      {
        id: 2,
        tradeId: 1,
        actionType: "BUY",
        actionDate: new Date("2025-01-02"),
        price: "105.00",
        quantity: 5,
        note: null,
        createdAt: new Date(),
      },
    ];

    const cashChange = calculateCashChange(actions, commissionRate);
    // 첫 매수: -1000.7, 두 번째 매수: -(105 * 5 * 1.0007) = -525.3675
    // 합계: -1526.0675
    expect(cashChange).toBeCloseTo(-1526.07, 2);
  });
});
