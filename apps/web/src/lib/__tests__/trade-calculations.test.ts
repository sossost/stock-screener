import { describe, it, expect } from "vitest";
import {
  calculateTradeMetrics,
  calculateFinalResults,
  calculateTradeStats,
  canSellQuantity,
  isFullySold,
  calculateHoldingDays,
  calculateUnrealizedPnl,
} from "../trades/calculations";
import { TradeAction, Trade } from "../trades/types";

// 헬퍼: 테스트용 액션 생성
function createAction(
  type: "BUY" | "SELL",
  price: number,
  quantity: number,
  date: string = "2025-01-01"
): TradeAction {
  return {
    id: Math.random(),
    tradeId: 1,
    actionType: type,
    actionDate: new Date(date),
    price: price.toString(),
    quantity,
    note: null,
    createdAt: new Date(),
  };
}

describe("calculateTradeMetrics", () => {
  // 수수료 0으로 테스트 (순수 손익 검증)
  const NO_COMMISSION = 0;

  it("단일 매수 시 평단가와 보유수량 계산", () => {
    const actions = [createAction("BUY", 100, 10)];
    const result = calculateTradeMetrics(actions, null, NO_COMMISSION);

    expect(result.avgEntryPrice).toBe(100);
    expect(result.currentQuantity).toBe(10);
    expect(result.totalBuyAmount).toBe(1000);
    expect(result.totalBuyQuantity).toBe(10);
    expect(result.totalSellQuantity).toBe(0);
    expect(result.realizedPnl).toBe(0);
    expect(result.totalCommission).toBe(0);
  });

  it("분할 매수 시 가중평균 평단가 계산", () => {
    const actions = [
      createAction("BUY", 100, 10), // 1000
      createAction("BUY", 120, 10), // 1200
    ];
    const result = calculateTradeMetrics(actions, null, NO_COMMISSION);

    // (1000 + 1200) / 20 = 110
    expect(result.avgEntryPrice).toBe(110);
    expect(result.currentQuantity).toBe(20);
    expect(result.totalBuyAmount).toBe(2200);
  });

  it("부분 매도 시 실현손익 계산", () => {
    const actions = [
      createAction("BUY", 100, 10),
      createAction("SELL", 120, 5),
    ];
    const result = calculateTradeMetrics(actions, null, NO_COMMISSION);

    expect(result.avgEntryPrice).toBe(100);
    expect(result.currentQuantity).toBe(5);
    expect(result.totalSellQuantity).toBe(5);
    // 매도금액 600 - 원가(100*5=500) = 100
    expect(result.realizedPnl).toBe(100);
    expect(result.realizedRoi).toBeCloseTo(0.2); // 100/500 = 20%
  });

  it("전량 매도 시 실현손익 계산", () => {
    const actions = [
      createAction("BUY", 100, 10),
      createAction("SELL", 150, 10),
    ];
    const result = calculateTradeMetrics(actions, null, NO_COMMISSION);

    expect(result.currentQuantity).toBe(0);
    // 매도금액 1500 - 원가 1000 = 500
    expect(result.realizedPnl).toBe(500);
    expect(result.realizedRoi).toBeCloseTo(0.5); // 50%
  });

  it("손실 매매 시 음수 손익 계산", () => {
    const actions = [
      createAction("BUY", 100, 10),
      createAction("SELL", 80, 10),
    ];
    const result = calculateTradeMetrics(actions, null, NO_COMMISSION);

    // 매도금액 800 - 원가 1000 = -200
    expect(result.realizedPnl).toBe(-200);
    expect(result.realizedRoi).toBeCloseTo(-0.2); // -20%
  });

  it("R-Multiple 계산 (손절가 있을 때)", () => {
    const actions = [
      createAction("BUY", 100, 10),
      createAction("SELL", 120, 10),
    ];
    // 손절가 90이면 리스크 = 100 - 90 = 10
    // 수익 = (1200 - 1000) / 10 = 20 (주당)
    // R = 20 / 10 = 2
    const result = calculateTradeMetrics(actions, "90", NO_COMMISSION);

    expect(result.rMultiple).toBeCloseTo(2);
  });

  it("손절가 없으면 R-Multiple은 null", () => {
    const actions = [
      createAction("BUY", 100, 10),
      createAction("SELL", 120, 10),
    ];
    const result = calculateTradeMetrics(actions, null, NO_COMMISSION);

    expect(result.rMultiple).toBeNull();
  });

  it("매도 없으면 R-Multiple은 null", () => {
    const actions = [createAction("BUY", 100, 10)];
    const result = calculateTradeMetrics(actions, "90", NO_COMMISSION);

    expect(result.rMultiple).toBeNull();
  });

  it("빈 액션 배열 처리", () => {
    const result = calculateTradeMetrics([], null, NO_COMMISSION);

    expect(result.avgEntryPrice).toBe(0);
    expect(result.currentQuantity).toBe(0);
    expect(result.realizedPnl).toBe(0);
  });

  it("수수료 적용 시 손익 감소", () => {
    const actions = [
      createAction("BUY", 100, 10), // 1000
      createAction("SELL", 150, 10), // 1500
    ];
    // 수수료율 0.1% (총 거래금액 2500 * 0.001 = 2.5)
    const result = calculateTradeMetrics(actions, null, 0.1);

    // 순수 손익 500 - 수수료 2.5 = 497.5
    expect(result.totalCommission).toBe(2.5);
    expect(result.realizedPnl).toBe(497.5);
  });

  it("기본 수수료율 0.07% 적용", () => {
    const actions = [
      createAction("BUY", 100, 10), // 1000
      createAction("SELL", 150, 10), // 1500
    ];
    // 기본 수수료율 적용 (0.07%)
    const result = calculateTradeMetrics(actions);

    // 총 거래금액 2500 * 0.0007 = 1.75
    expect(result.totalCommission).toBeCloseTo(1.75);
    expect(result.realizedPnl).toBeCloseTo(498.25);
  });
});

describe("calculateFinalResults", () => {
  const NO_COMMISSION = 0;

  it("최종 결과 계산 (수수료 없음)", () => {
    const actions = [
      createAction("BUY", 100, 10),
      createAction("SELL", 130, 10),
    ];
    const result = calculateFinalResults(actions, "90", NO_COMMISSION);

    expect(result.finalPnl).toBe(300);
    expect(result.finalRoi).toBeCloseTo(0.3);
    expect(result.finalRMultiple).toBeCloseTo(3); // 30/10 = 3R
  });

  it("수수료 적용 시 최종 결과", () => {
    const actions = [
      createAction("BUY", 100, 10), // 1000
      createAction("SELL", 130, 10), // 1300
    ];
    // 총 거래금액 2300 * 0.001 = 2.3
    const result = calculateFinalResults(actions, "90", 0.1);

    expect(result.finalPnl).toBeCloseTo(297.7);
  });
});

describe("calculateTradeStats", () => {
  // 헬퍼: 테스트용 Trade 생성
  function createTrade(
    status: "OPEN" | "CLOSED",
    finalPnl: number | null,
    finalRMultiple: number | null = null,
    mistakeType: string | null = null
  ): Trade & { actions: TradeAction[] } {
    return {
      id: Math.random(),
      userId: "0",
      symbol: "TEST",
      status,
      strategy: null,
      planEntryPrice: null,
      planStopLoss: null,
      planTargetPrice: null,
      planTargets: null,
      entryReason: null,
      commissionRate: "0.07",
      finalPnl: finalPnl?.toString() ?? null,
      finalRoi: null,
      finalRMultiple: finalRMultiple?.toString() ?? null,
      mistakeType,
      reviewNote: null,
      startDate: null,
      endDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      actions: [],
    };
  }

  it("승률 계산", () => {
    const trades = [
      createTrade("CLOSED", 100),
      createTrade("CLOSED", 50),
      createTrade("CLOSED", -30),
      createTrade("CLOSED", -20),
    ];
    const stats = calculateTradeStats(trades);

    expect(stats.totalTrades).toBe(4);
    expect(stats.winningTrades).toBe(2);
    expect(stats.losingTrades).toBe(2);
    expect(stats.winRate).toBe(50);
  });

  it("총 손익 계산", () => {
    const trades = [createTrade("CLOSED", 100), createTrade("CLOSED", -30)];
    const stats = calculateTradeStats(trades);

    expect(stats.totalPnl).toBe(70);
    expect(stats.maxProfit).toBe(100);
    expect(stats.maxLoss).toBe(-30);
  });

  it("평균 R-Multiple 계산", () => {
    const trades = [
      createTrade("CLOSED", 100, 2),
      createTrade("CLOSED", 50, 1),
      createTrade("CLOSED", -30, -0.5),
    ];
    const stats = calculateTradeStats(trades);

    // (2 + 1 + -0.5) / 3 = 0.833...
    expect(stats.avgRMultiple).toBeCloseTo(0.833, 2);
  });

  it("실수 유형별 통계", () => {
    const trades = [
      createTrade("CLOSED", 100, null, "원칙준수"),
      createTrade("CLOSED", -30, null, "추격매수"),
      createTrade("CLOSED", -20, null, "추격매수"),
    ];
    const stats = calculateTradeStats(trades);

    expect(stats.mistakeStats["원칙준수"]).toBe(1);
    expect(stats.mistakeStats["추격매수"]).toBe(2);
  });

  it("OPEN 매매는 통계에서 제외", () => {
    const trades = [createTrade("OPEN", null), createTrade("CLOSED", 100)];
    const stats = calculateTradeStats(trades);

    expect(stats.totalTrades).toBe(1);
  });

  it("빈 배열 처리", () => {
    const stats = calculateTradeStats([]);

    expect(stats.totalTrades).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.avgRMultiple).toBeNull();
  });
});

describe("canSellQuantity", () => {
  it("보유 수량 내 매도 가능", () => {
    const actions = [createAction("BUY", 100, 10)];
    expect(canSellQuantity(actions, 5)).toBe(true);
    expect(canSellQuantity(actions, 10)).toBe(true);
  });

  it("보유 수량 초과 매도 불가", () => {
    const actions = [createAction("BUY", 100, 10)];
    expect(canSellQuantity(actions, 11)).toBe(false);
  });

  it("부분 매도 후 잔량 확인", () => {
    const actions = [
      createAction("BUY", 100, 10),
      createAction("SELL", 120, 5),
    ];
    expect(canSellQuantity(actions, 5)).toBe(true);
    expect(canSellQuantity(actions, 6)).toBe(false);
  });
});

describe("isFullySold", () => {
  it("전량 매도 확인", () => {
    const actions = [
      createAction("BUY", 100, 10),
      createAction("SELL", 120, 10),
    ];
    expect(isFullySold(actions)).toBe(true);
  });

  it("부분 보유 시 false", () => {
    const actions = [
      createAction("BUY", 100, 10),
      createAction("SELL", 120, 5),
    ];
    expect(isFullySold(actions)).toBe(false);
  });

  it("매수만 있으면 false", () => {
    const actions = [createAction("BUY", 100, 10)];
    expect(isFullySold(actions)).toBe(false);
  });

  it("빈 액션이면 false", () => {
    expect(isFullySold([])).toBe(false);
  });
});

describe("calculateHoldingDays", () => {
  it("정상적인 보유 기간 계산", () => {
    const result = calculateHoldingDays("2025-01-01", "2025-01-15");
    expect(result).toBe(14);
  });

  it("같은 날짜면 0일", () => {
    const result = calculateHoldingDays("2025-01-01", "2025-01-01");
    expect(result).toBe(0);
  });

  it("Date 객체도 처리", () => {
    const start = new Date("2025-01-01");
    const end = new Date("2025-01-10");
    const result = calculateHoldingDays(start, end);
    expect(result).toBe(9);
  });

  it("startDate가 null이면 undefined", () => {
    const result = calculateHoldingDays(null, "2025-01-15");
    expect(result).toBeUndefined();
  });

  it("endDate가 null이면 undefined", () => {
    const result = calculateHoldingDays("2025-01-01", null);
    expect(result).toBeUndefined();
  });

  it("둘 다 undefined면 undefined", () => {
    const result = calculateHoldingDays(undefined, undefined);
    expect(result).toBeUndefined();
  });

  it("유효하지 않은 날짜면 undefined", () => {
    const result = calculateHoldingDays("invalid", "2025-01-15");
    expect(result).toBeUndefined();
  });
});

describe("calculateUnrealizedPnl", () => {
  it("수익인 경우 양수 손익", () => {
    const result = calculateUnrealizedPnl(100, 10, 120);

    // (120 - 100) * 10 = 200
    expect(result.unrealizedPnl).toBe(200);
    // 200 / (100 * 10) = 0.2 (20%)
    expect(result.unrealizedRoi).toBeCloseTo(0.2);
  });

  it("손실인 경우 음수 손익", () => {
    const result = calculateUnrealizedPnl(100, 10, 80);

    // (80 - 100) * 10 = -200
    expect(result.unrealizedPnl).toBe(-200);
    // -200 / (100 * 10) = -0.2 (-20%)
    expect(result.unrealizedRoi).toBeCloseTo(-0.2);
  });

  it("현재가가 평단가와 같으면 0", () => {
    const result = calculateUnrealizedPnl(100, 10, 100);

    expect(result.unrealizedPnl).toBe(0);
    expect(result.unrealizedRoi).toBe(0);
  });

  it("수량이 0이면 0 반환", () => {
    const result = calculateUnrealizedPnl(100, 0, 120);

    expect(result.unrealizedPnl).toBe(0);
    expect(result.unrealizedRoi).toBe(0);
  });

  it("평단가가 0이면 0 반환", () => {
    const result = calculateUnrealizedPnl(0, 10, 120);

    expect(result.unrealizedPnl).toBe(0);
    expect(result.unrealizedRoi).toBe(0);
  });

  it("현재가가 0이면 0 반환", () => {
    const result = calculateUnrealizedPnl(100, 10, 0);

    expect(result.unrealizedPnl).toBe(0);
    expect(result.unrealizedRoi).toBe(0);
  });

  it("음수 값이면 0 반환", () => {
    const result = calculateUnrealizedPnl(100, -5, 120);

    expect(result.unrealizedPnl).toBe(0);
    expect(result.unrealizedRoi).toBe(0);
  });
});
