"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { formatPositionValue, formatQuantity } from "@/utils/format";

interface PositionCalculatorProps {
  totalAssets?: number;
  onApply?: (quantity: number, entryPrice: number, stopLoss: number) => void;
}

export default function PositionCalculator({
  totalAssets = 0,
  onApply,
}: PositionCalculatorProps) {
  const [accountBalance, setAccountBalance] = useState(
    totalAssets > 0 ? totalAssets.toString() : ""
  );
  const [riskPercent, setRiskPercent] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  const calculation = useMemo(() => {
    const balance = parseFloat(accountBalance) || 0;
    const risk = parseFloat(riskPercent) || 0;
    const entry = parseFloat(entryPrice) || 0;
    const stop = parseFloat(stopLoss) || 0;

    if (balance <= 0 || risk <= 0 || entry <= 0 || stop <= 0) {
      return null;
    }

    if (stop >= entry) {
      return { error: "손절가는 진입가보다 낮아야 합니다" };
    }

    const riskAmount = balance * (risk / 100);
    const riskPerShare = entry - stop;
    const quantity = Math.floor(riskAmount / riskPerShare);
    const positionSize = quantity * entry;
    const positionPercent = (positionSize / balance) * 100;
    const actualRiskAmount = quantity * riskPerShare;

    return {
      riskAmount,
      riskPerShare,
      quantity,
      positionSize,
      positionPercent,
      actualRiskAmount,
    };
  }, [accountBalance, riskPercent, entryPrice, stopLoss]);

  const handleApply = () => {
    if (calculation && !("error" in calculation) && onApply) {
      onApply(
        calculation.quantity,
        parseFloat(entryPrice),
        parseFloat(stopLoss)
      );
    }
  };

  return (
    <div className="bg-white border rounded-md p-4">
      <h3 className="text-sm font-medium text-gray-600 mb-3">
        📐 포지션 계산기
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">계좌 잔고</label>
          <div className="flex items-center">
            <span className="text-gray-400 mr-1">$</span>
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
              placeholder="10000"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">리스크 %</label>
          <div className="flex items-center">
            <input
              type="number"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
              placeholder="1"
              step="0.5"
              min="0.1"
              max="10"
            />
            <span className="text-gray-400 ml-1">%</span>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">진입가</label>
          <div className="flex items-center">
            <span className="text-gray-400 mr-1">$</span>
            <input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
              placeholder="100"
              step="0.01"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">손절가</label>
          <div className="flex items-center">
            <span className="text-gray-400 mr-1">$</span>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
              placeholder="95"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* 계산 결과 */}
      {calculation && (
        <div className="border-t pt-3">
          {"error" in calculation ? (
            <p className="text-sm text-red-500">{calculation.error}</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">적정 수량</span>
                <span className="text-lg font-semibold text-blue-600">
                  {formatQuantity(calculation.quantity)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">포지션 크기</span>
                <span>
                  {formatPositionValue(calculation.positionSize)}
                  <span className="text-gray-400 ml-1">
                    ({calculation.positionPercent.toFixed(1)}%)
                  </span>
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">실제 리스크</span>
                <span className="text-red-600">
                  {formatPositionValue(calculation.actualRiskAmount)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">주당 리스크</span>
                <span>${calculation.riskPerShare.toFixed(2)}</span>
              </div>

              {onApply && calculation.quantity > 0 && (
                <Button
                  onClick={handleApply}
                  size="sm"
                  className="w-full mt-2"
                >
                  매매에 적용
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

