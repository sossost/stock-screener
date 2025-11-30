"use client";

import { TradeListItem, PlanTarget } from "@/lib/trades/types";
import { calculateUnrealizedPnl } from "@/lib/trades/calculations";
import { formatRoi, formatPnlFull, formatQuantity, formatPositionValueFull, formatPrice } from "@/utils/format";
import PriceBarChart from "./PriceBarChart";
import PriceBarLegend from "./PriceBarLegend";

interface PriceBarPopupProps {
  trade: TradeListItem;
}

export function PriceBarPopup({ trade }: PriceBarPopupProps) {
  const { avgEntryPrice, currentQuantity } = trade.calculated;
  const currentPrice = trade.currentPrice || 0;

  const targets: PlanTarget[] = (trade.planTargets as PlanTarget[] | null)?.length
    ? (trade.planTargets as PlanTarget[])
    : trade.planTargetPrice
      ? [{ price: parseFloat(trade.planTargetPrice), weight: 100 }]
      : [];

  const stopLoss = trade.planStopLoss ? parseFloat(trade.planStopLoss) : null;
  const maxTarget = targets.length > 0 ? Math.max(...targets.map((t) => t.price)) : null;

  if (stopLoss === null || maxTarget === null) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        손절가와 목표가를 설정하면 차트가 표시됩니다
      </div>
    );
  }

  const chartMin = stopLoss;
  const chartMax = maxTarget;

  const { unrealizedPnl, unrealizedRoi } = calculateUnrealizedPnl(
    avgEntryPrice,
    currentQuantity,
    currentPrice
  );

  return (
    <div className="p-4 w-96">
      {/* 심볼 + 손익 */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-lg">{trade.symbol}</span>
        <span className={`font-bold ${unrealizedPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
          {formatPnlFull(unrealizedPnl)} ({formatRoi(unrealizedRoi)})
        </span>
      </div>

      {/* 바 차트 */}
      <div className="mb-4">
        <PriceBarChart
          stopLoss={stopLoss}
          avgEntryPrice={avgEntryPrice}
          currentPrice={currentPrice}
          targets={targets.map((t) => t.price)}
          chartMin={chartMin}
          chartMax={chartMax}
        />
      </div>

      {/* 레전드 */}
      <PriceBarLegend
        stopLoss={stopLoss}
        avgEntryPrice={avgEntryPrice}
        currentPrice={currentPrice}
        targets={targets}
      />

      {/* 포지션 정보 */}
      <div className="mt-3 pt-3 border-t text-xs text-gray-500">
        보유 {formatQuantity(currentQuantity)}주 × {formatPrice(avgEntryPrice)} = {formatPositionValueFull(avgEntryPrice * currentQuantity)}
      </div>
    </div>
  );
}
