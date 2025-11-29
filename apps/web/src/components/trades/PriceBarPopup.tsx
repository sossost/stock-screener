"use client";

import { TradeListItem, PlanTarget } from "@/lib/trades/types";
import { calculateUnrealizedPnl } from "@/lib/trades/calculations";
import { formatRoi, formatPrice, formatPercent, formatPnlFull, formatQuantity, formatPositionValueFull } from "@/utils/format";

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
  const chartRange = chartMax - chartMin;

  const getPosition = (price: number) => {
    if (chartRange === 0) return 50;
    const pos = ((price - chartMin) / chartRange) * 100;
    return Math.max(0, Math.min(100, pos));
  };

  const getPercent = (price: number) => {
    if (avgEntryPrice <= 0) return null;
    return ((price - avgEntryPrice) / avgEntryPrice) * 100;
  };

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
        <div className="relative h-5">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-gray-200 rounded-full" />

          {avgEntryPrice > 0 && currentPrice > 0 && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 h-2 rounded-full ${
                currentPrice >= avgEntryPrice ? "bg-blue-300" : "bg-red-300"
              }`}
              style={{
                left: `${Math.min(getPosition(avgEntryPrice), getPosition(currentPrice))}%`,
                width: `${Math.abs(getPosition(currentPrice) - getPosition(avgEntryPrice))}%`,
              }}
            />
          )}

          {/* 손절가 점 */}
          <div
            className="absolute top-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow"
            style={{ left: "0%", transform: "translate(-50%, -50%)" }}
          />

          {/* 평단가 점 */}
          {avgEntryPrice > 0 && (
            <div
              className="absolute top-1/2 w-3 h-3 bg-gray-700 rounded-full border-2 border-white shadow z-10"
              style={{ left: `${getPosition(avgEntryPrice)}%`, transform: "translate(-50%, -50%)" }}
            />
          )}

          {/* 현재가 점 */}
          {currentPrice > 0 && (
            <div
              className="absolute top-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow z-20"
              style={{ left: `${getPosition(currentPrice)}%`, transform: "translate(-50%, -50%)" }}
            />
          )}

          {/* 목표가 점 */}
          {targets.map((target, index) => (
            <div
              key={index}
              className="absolute top-1/2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow"
              style={{ left: `${getPosition(target.price)}%`, transform: "translate(-50%, -50%)" }}
            />
          ))}
        </div>
      </div>

      {/* 레전드 */}
      <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
          <span className="text-gray-600">손절</span>
          <span className="text-red-600">{formatPrice(stopLoss)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-gray-700 rounded-full" />
          <span className="text-gray-600">평단</span>
          <span>{formatPrice(avgEntryPrice)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
          <span className="text-gray-600">현재</span>
          <span className={currentPrice >= avgEntryPrice ? "text-blue-600" : "text-red-500"}>
            {formatPrice(currentPrice)} ({getPercent(currentPrice)! >= 0 ? "+" : ""}{formatPercent(getPercent(currentPrice)!, 1)})
          </span>
        </div>
        {targets.map((target, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
            <span className="text-gray-600">{targets.length > 1 ? `${index + 1}차 목표` : "목표"}</span>
            <span className="text-green-600">{formatPrice(target.price)}</span>
          </div>
        ))}
      </div>

      {/* 포지션 정보 */}
      <div className="mt-3 pt-3 border-t text-xs text-gray-500">
        보유 {formatQuantity(currentQuantity)}주 × {formatPrice(avgEntryPrice)} = {formatPositionValueFull(avgEntryPrice * currentQuantity)}
      </div>
    </div>
  );
}
