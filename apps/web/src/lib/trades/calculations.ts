import { TradeAction, TradeCalculated, Trade } from "./types";

/** 기본 수수료율 (%) */
export const DEFAULT_COMMISSION_RATE = 0.07;

/**
 * 매수/매도 내역을 기반으로 매매 계산값을 산출
 * @param actions 매수/매도 내역
 * @param planStopLoss 계획 손절가
 * @param commissionRate 수수료율 (%, 기본 0.07%)
 */
export function calculateTradeMetrics(
  actions: TradeAction[],
  planStopLoss?: string | null,
  commissionRate: number = DEFAULT_COMMISSION_RATE
): TradeCalculated {
  let totalBuyQuantity = 0;
  let totalBuyAmount = 0;
  let totalSellQuantity = 0;
  let totalSellAmount = 0;

  // 날짜순 정렬
  const sortedActions = [...actions].sort(
    (a, b) =>
      new Date(a.actionDate).getTime() - new Date(b.actionDate).getTime()
  );

  for (const action of sortedActions) {
    const price = parseFloat(action.price);
    const quantity = action.quantity;

    if (action.actionType === "BUY") {
      totalBuyQuantity += quantity;
      totalBuyAmount += price * quantity;
    } else if (action.actionType === "SELL") {
      totalSellQuantity += quantity;
      totalSellAmount += price * quantity;
    }
  }

  // 평균 진입가 (가중평균)
  const avgEntryPrice =
    totalBuyQuantity > 0 ? totalBuyAmount / totalBuyQuantity : 0;

  // 현재 보유 수량
  const currentQuantity = totalBuyQuantity - totalSellQuantity;

  // 수수료 계산 (매수 + 매도 금액의 수수료율 적용)
  const commissionRateDecimal = commissionRate / 100;
  const totalCommission =
    (totalBuyAmount + totalSellAmount) * commissionRateDecimal;

  // 실현 손익 계산 (수수료 차감)
  // 매도한 수량만큼의 평균 진입가 기준 손익 - 수수료
  const grossPnl =
    totalSellQuantity > 0
      ? totalSellAmount - avgEntryPrice * totalSellQuantity
      : 0;
  const realizedPnl = grossPnl - totalCommission;

  // 실현 수익률 (수수료 포함)
  const costBasis = avgEntryPrice * totalSellQuantity;
  const realizedRoi = costBasis > 0 ? realizedPnl / costBasis : 0;

  // R-Multiple 계산 (손절가가 있을 때만)
  let rMultiple: number | null = null;
  if (planStopLoss && avgEntryPrice > 0 && totalSellQuantity > 0) {
    const stopLossPrice = parseFloat(planStopLoss);
    const riskPerShare = avgEntryPrice - stopLossPrice;

    if (riskPerShare > 0) {
      const profitPerShare = realizedPnl / totalSellQuantity;
      rMultiple = profitPerShare / riskPerShare;
    }
  }

  // 평균 청산가 (매도 가중평균)
  const avgExitPrice =
    totalSellQuantity > 0 ? totalSellAmount / totalSellQuantity : 0;

  return {
    avgEntryPrice,
    currentQuantity,
    totalBuyAmount,
    totalBuyQuantity,
    totalSellAmount,
    totalSellQuantity,
    totalCommission,
    realizedPnl,
    realizedRoi,
    rMultiple,
    avgExitPrice,
  };
}

/**
 * 매매 종료 시 최종 결과 계산
 */
export function calculateFinalResults(
  actions: TradeAction[],
  planStopLoss?: string | null,
  commissionRate: number = DEFAULT_COMMISSION_RATE
): {
  finalPnl: number;
  finalRoi: number;
  finalRMultiple: number | null;
} {
  const metrics = calculateTradeMetrics(actions, planStopLoss, commissionRate);

  return {
    finalPnl: metrics.realizedPnl,
    finalRoi: metrics.realizedRoi,
    finalRMultiple: metrics.rMultiple,
  };
}

/** 전략별 통계 */
export interface StrategyStats {
  strategy: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgR: number | null;
}

/**
 * 여러 매매의 통계 계산
 */
export function calculateTradeStats(
  trades: (Trade & { actions: TradeAction[] })[]
) {
  const closedTrades = trades.filter((t) => t.status === "CLOSED");

  if (closedTrades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgRMultiple: null,
      maxProfit: 0,
      maxLoss: 0,
      mistakeStats: {},
      // 추가 통계
      profitFactor: null,
      avgHoldingDays: null,
      maxWinStreak: 0,
      maxLoseStreak: 0,
      avgWinAmount: 0,
      avgLossAmount: 0,
      strategyStats: [],
    };
  }

  let winningTrades = 0;
  let losingTrades = 0;
  let totalPnl = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  let maxProfit = 0;
  let maxLoss = 0;
  const rMultiples: number[] = [];
  const mistakeStats: Record<string, number> = {};

  // 보유 기간
  const holdingDays: number[] = [];

  // 연속 승/패 계산용
  let currentStreak = 0;
  let maxWinStreak = 0;
  let maxLoseStreak = 0;
  let lastResult: "win" | "loss" | null = null;

  // 전략별 통계
  const strategyMap = new Map<
    string,
    {
      trades: number;
      wins: number;
      losses: number;
      totalPnl: number;
      rValues: number[];
    }
  >();

  // 날짜순 정렬 (endDate 우선, 없으면 createdAt 사용)
  const sortedTrades = [...closedTrades].sort((a, b) => {
    const getDate = (trade: Trade) => {
      if (trade.endDate) return new Date(trade.endDate).getTime();
      if (trade.createdAt) return new Date(trade.createdAt).getTime();
      return 0;
    };
    return getDate(a) - getDate(b);
  });

  for (const trade of sortedTrades) {
    const pnl = trade.finalPnl ? parseFloat(trade.finalPnl) : 0;
    totalPnl += pnl;

    // 승/패 계산
    if (pnl > 0) {
      winningTrades++;
      totalProfit += pnl;
      maxProfit = Math.max(maxProfit, pnl);

      // 연속 승 계산
      if (lastResult === "win") {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
      lastResult = "win";
    } else if (pnl < 0) {
      losingTrades++;
      totalLoss += Math.abs(pnl);
      maxLoss = Math.min(maxLoss, pnl);

      // 연속 패 계산
      if (lastResult === "loss") {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      maxLoseStreak = Math.max(maxLoseStreak, currentStreak);
      lastResult = "loss";
    }

    if (trade.finalRMultiple) {
      rMultiples.push(parseFloat(trade.finalRMultiple));
    }

    if (trade.mistakeType) {
      mistakeStats[trade.mistakeType] =
        (mistakeStats[trade.mistakeType] || 0) + 1;
    }

    // 보유 기간 계산
    const days = calculateHoldingDays(trade.startDate, trade.endDate);
    if (days !== undefined) {
      holdingDays.push(days);
    }

    // 전략별 통계
    const strategy = trade.strategy || "기타";
    const existing = strategyMap.get(strategy) || {
      trades: 0,
      wins: 0,
      losses: 0,
      totalPnl: 0,
      rValues: [],
    };
    existing.trades++;
    if (pnl > 0) existing.wins++;
    else if (pnl < 0) existing.losses++;
    existing.totalPnl += pnl;
    if (trade.finalRMultiple) {
      existing.rValues.push(parseFloat(trade.finalRMultiple));
    }
    strategyMap.set(strategy, existing);
  }

  const winRate =
    closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;

  const avgRMultiple =
    rMultiples.length > 0
      ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length
      : null;

  // Profit Factor (총 이익 / 총 손실)
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : null;

  // 평균 보유 기간
  const avgHoldingDays =
    holdingDays.length > 0
      ? holdingDays.reduce((a, b) => a + b, 0) / holdingDays.length
      : null;

  // 평균 승/패 금액
  const avgWinAmount = winningTrades > 0 ? totalProfit / winningTrades : 0;
  const avgLossAmount = losingTrades > 0 ? totalLoss / losingTrades : 0;

  // 전략별 통계 배열 생성
  const strategyStats: StrategyStats[] = Array.from(strategyMap.entries())
    .map(([strategy, data]) => ({
      strategy,
      trades: data.trades,
      wins: data.wins,
      losses: data.losses,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      totalPnl: data.totalPnl,
      avgR:
        data.rValues.length > 0
          ? data.rValues.reduce((a, b) => a + b, 0) / data.rValues.length
          : null,
    }))
    .sort((a, b) => b.trades - a.trades);

  return {
    totalTrades: closedTrades.length,
    winningTrades,
    losingTrades,
    winRate,
    totalPnl,
    avgRMultiple,
    maxProfit,
    maxLoss,
    mistakeStats,
    // 추가 통계
    profitFactor,
    avgHoldingDays,
    maxWinStreak,
    maxLoseStreak,
    avgWinAmount,
    avgLossAmount,
    strategyStats,
  };
}

/**
 * 보유 수량 검증 (매도 시)
 * @returns 매도 가능하면 true, 불가능하면 false
 */
export function canSellQuantity(
  actions: TradeAction[],
  sellQuantity: number
): boolean {
  const metrics = calculateTradeMetrics(actions);
  return metrics.currentQuantity >= sellQuantity;
}

/**
 * 전량 매도 여부 확인
 */
export function isFullySold(actions: TradeAction[]): boolean {
  const metrics = calculateTradeMetrics(actions);
  return metrics.currentQuantity === 0 && metrics.totalBuyQuantity > 0;
}

/**
 * 보유 기간 계산 (일수)
 * @param startDate 시작일
 * @param endDate 종료일
 * @returns 보유 기간 (일수), 날짜가 없으면 undefined
 */
export function calculateHoldingDays(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): number | undefined {
  if (!startDate || !endDate) return undefined;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return undefined;

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * 미실현 손익 계산
 * @param avgEntryPrice 평균 진입가
 * @param currentQuantity 현재 보유 수량
 * @param currentPrice 현재가
 * @returns 미실현 손익 및 수익률
 */
export function calculateUnrealizedPnl(
  avgEntryPrice: number,
  currentQuantity: number,
  currentPrice: number
): { unrealizedPnl: number; unrealizedRoi: number } {
  if (currentQuantity <= 0 || avgEntryPrice <= 0 || currentPrice <= 0) {
    return { unrealizedPnl: 0, unrealizedRoi: 0 };
  }

  const unrealizedPnl = (currentPrice - avgEntryPrice) * currentQuantity;
  const unrealizedRoi = unrealizedPnl / (avgEntryPrice * currentQuantity);

  return { unrealizedPnl, unrealizedRoi };
}

/**
 * 액션 배열을 기반으로 현금 변화량 계산
 * @param actions 매수/매도 액션 배열
 * @param commissionRate 수수료율 (%, 기본 0.07%)
 * @returns 현금 변화량 (양수: 증가, 음수: 감소)
 */
export function calculateCashChange(
  actions: TradeAction[],
  commissionRate: number = DEFAULT_COMMISSION_RATE
): number {
  const commissionRateDecimal = commissionRate / 100;
  let totalChange = 0;

  for (const action of actions) {
    const price = parseFloat(action.price);
    const quantity = action.quantity;

    if (action.actionType === "BUY") {
      // 매수: 현금 감소 (가격 * 수량 * (1 + 수수료율))
      totalChange -= price * quantity * (1 + commissionRateDecimal);
    } else if (action.actionType === "SELL") {
      // 매도: 현금 증가 (가격 * 수량 * (1 - 수수료율))
      totalChange += price * quantity * (1 - commissionRateDecimal);
    }
  }

  return totalChange;
}

/**
 * 매도 액션별 실현손익 계산
 * @param sellActions 매도 액션 배열 (date, price, quantity)
 * @param avgEntryPrice 평균 진입가
 * @param totalBuyAmount 총 매수 금액
 * @param totalSellQuantity 총 매도 수량
 * @param commissionRate 수수료율 (%, 기본 0.07%)
 * @returns 매도 액션별 실현손익 배열
 */
export interface SellActionPnl {
  date: string;
  realizedPnl: number;
}

export function calculateSellActionPnl(
  sellActions: Array<{ date: string; price: number; quantity: number }>,
  avgEntryPrice: number,
  totalBuyAmount: number,
  totalSellQuantity: number,
  commissionRate: number
): SellActionPnl[] {
  const commissionRateDecimal = commissionRate / 100;

  return sellActions.map((sellAction) => {
    // 입력 검증
    if (isNaN(sellAction.price) || isNaN(sellAction.quantity)) {
      throw new Error(
        `Invalid sell action data: price=${sellAction.price}, quantity=${sellAction.quantity}`
      );
    }

    const sellAmount = sellAction.price * sellAction.quantity;

    // 매도 수량 비율로 매수 수수료 분배
    const sellQuantityRatio =
      totalSellQuantity > 0 ? sellAction.quantity / totalSellQuantity : 0;
    const allocatedBuyCommission =
      totalBuyAmount * commissionRateDecimal * sellQuantityRatio;
    const sellCommission = sellAmount * commissionRateDecimal;
    const totalSellCommission = allocatedBuyCommission + sellCommission;

    // 실현손익 계산
    const sellGrossPnl =
      (sellAction.price - avgEntryPrice) * sellAction.quantity;
    const sellRealizedPnl = sellGrossPnl - totalSellCommission;

    return {
      date: sellAction.date,
      realizedPnl: sellRealizedPnl,
    };
  });
}
