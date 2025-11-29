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

/**
 * 여러 매매의 통계 계산
 */
export function calculateTradeStats(trades: (Trade & { actions: TradeAction[] })[]) {
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
    };
  }

  let winningTrades = 0;
  let losingTrades = 0;
  let totalPnl = 0;
  let maxProfit = 0;
  let maxLoss = 0;
  const rMultiples: number[] = [];
  const mistakeStats: Record<string, number> = {};

  for (const trade of closedTrades) {
    const pnl = trade.finalPnl ? parseFloat(trade.finalPnl) : 0;

    totalPnl += pnl;

    if (pnl > 0) {
      winningTrades++;
      maxProfit = Math.max(maxProfit, pnl);
    } else if (pnl < 0) {
      losingTrades++;
      maxLoss = Math.min(maxLoss, pnl);
    }

    if (trade.finalRMultiple) {
      rMultiples.push(parseFloat(trade.finalRMultiple));
    }

    if (trade.mistakeType) {
      mistakeStats[trade.mistakeType] =
        (mistakeStats[trade.mistakeType] || 0) + 1;
    }
  }

  const winRate =
    closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;

  const avgRMultiple =
    rMultiples.length > 0
      ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length
      : null;

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

