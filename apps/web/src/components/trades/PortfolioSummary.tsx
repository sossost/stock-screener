"use client";

import { useEffect, useMemo } from "react";
import { TradeListItem } from "@/lib/trades/types";
import {
  formatPositionValueFull,
  formatPnlFull,
  formatRoi,
} from "@/utils/format";
import { STOCK_COLORS } from "@/utils/colors";
import { calculateUnrealizedPnl } from "@/lib/trades/calculations";
import AssetFlowChart from "./charts/AssetFlowChart";
import AssetAllocationChart from "./charts/AssetAllocationChart";
import AssetAllocationLegend from "./charts/AssetAllocationLegend";

interface PositionItem {
  symbol: string;
  value: number;
  weight: number;
  color: string;
}

interface PortfolioSummaryProps {
  trades: TradeListItem[];
  onTotalAssetsChange?: (totalAssets: number) => void;
}

export default function PortfolioSummary({
  trades,
  onTotalAssetsChange,
}: PortfolioSummaryProps) {
  const openTrades = trades.filter((t) => t.status === "OPEN");

  const positionValues = openTrades.map((trade) => {
    const currentPrice = trade.currentPrice || 0;
    const quantity = trade.calculated.currentQuantity;
    const value =
      currentPrice > 0
        ? currentPrice * quantity
        : trade.calculated.avgEntryPrice * quantity;
    return { symbol: trade.symbol, value };
  });

  const totalPositionValue = positionValues.reduce(
    (sum, p) => sum + p.value,
    0
  );
  const totalAssets = totalPositionValue;

  // 원금 계산 (평균 진입가 * 현재 수량)
  const totalCostBasis = useMemo(() => {
    return openTrades.reduce((sum, trade) => {
      const { avgEntryPrice, currentQuantity } = trade.calculated;
      if (avgEntryPrice > 0 && currentQuantity > 0) {
        return sum + avgEntryPrice * currentQuantity;
      }
      return sum;
    }, 0);
  }, [openTrades]);

  // 미실현 손익 계산
  const totalUnrealizedPnl = useMemo(() => {
    return openTrades.reduce((sum, trade) => {
      const currentPrice = trade.currentPrice || 0;
      const { avgEntryPrice, currentQuantity } = trade.calculated;
      if (currentPrice > 0 && avgEntryPrice > 0 && currentQuantity > 0) {
        const { unrealizedPnl } = calculateUnrealizedPnl(
          avgEntryPrice,
          currentQuantity,
          currentPrice
        );
        return sum + unrealizedPnl;
      }
      return sum;
    }, 0);
  }, [openTrades]);

  // 수익률 계산
  const totalRoi = useMemo(() => {
    return totalCostBasis > 0 ? totalUnrealizedPnl / totalCostBasis : 0;
  }, [totalCostBasis, totalUnrealizedPnl]);

  useEffect(() => {
    onTotalAssetsChange?.(totalAssets);
  }, [totalAssets, onTotalAssetsChange]);

  // 종목별 비중 계산
  const positions: PositionItem[] = useMemo(() => {
    return positionValues.map((p, i) => ({
      symbol: p.symbol,
      value: p.value,
      weight: totalAssets > 0 ? (p.value / totalAssets) * 100 : 0,
      color: STOCK_COLORS[i % STOCK_COLORS.length],
    }));
  }, [positionValues, totalAssets]);

  // 도넛 차트 세그먼트 계산 (종목만)
  const segments = useMemo(() => {
    return positions
      .filter((p) => p.weight > 0)
      .map((p) => ({
        label: p.symbol,
        weight: p.weight,
        color: p.color, // positions의 색상 재사용
      }));
  }, [positions]);

  return (
    <div className="bg-white border rounded-md mb-3">
      <div className="grid grid-cols-2">
        {/* 좌측: 포지션 현황 + 파이차트 */}
        <div className="p-4 border-r">
          <div className="flex gap-6">
            {/* 텍스트 정보 */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-medium text-gray-500 mb-2">
                💰 포지션 현황
              </h3>

              <div className="mb-3">
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-bold">
                    {formatPositionValueFull(totalPositionValue)}
                  </span>
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="text-gray-600">
                      {formatPositionValueFull(totalCostBasis)}
                    </span>
                    {totalUnrealizedPnl !== 0 && (
                      <>
                        <span
                          className={`font-medium ${
                            totalUnrealizedPnl >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatPnlFull(totalUnrealizedPnl)}
                        </span>
                        <span
                          className={`text-xs ${
                            totalUnrealizedPnl >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          ({formatRoi(totalRoi)})
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {openTrades.length > 0 && (
                  <span className="text-gray-400 text-xs mt-1">
                    {openTrades.length}개 종목
                  </span>
                )}
              </div>
            </div>

            {/* 파이 차트 */}
            <div className="flex items-center justify-center flex-shrink-0">
              <AssetAllocationChart
                segments={segments}
                totalPositions={positions.length}
              />
            </div>
          </div>

          {/* 종목별 범례 */}
          <AssetAllocationLegend segments={segments} />
        </div>

        {/* 우측: 자산 흐름 */}
        <div className="p-4 flex flex-col h-full">
          <AssetFlowChart />
        </div>
      </div>
    </div>
  );
}
