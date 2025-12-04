"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TradeListItem } from "@/lib/trades/types";
import { formatPositionValue, formatPercent } from "@/utils/format";
import { STOCK_COLORS, CASH_COLOR } from "@/utils/colors";
import AssetFlowChart from "./charts/AssetFlowChart";
import AssetAllocationChart from "./charts/AssetAllocationChart";
import CashBalanceEditor from "./CashBalanceEditor";
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
  initialCashBalance?: number;
}

export default function PortfolioSummary({
  trades,
  onTotalAssetsChange,
  initialCashBalance = 0,
}: PortfolioSummaryProps) {
  const router = useRouter();
  const [cashBalance, setCashBalance] = useState<number>(initialCashBalance);

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
  const totalAssets = cashBalance + totalPositionValue;

  useEffect(() => {
    onTotalAssetsChange?.(totalAssets);
  }, [totalAssets, onTotalAssetsChange]);

  const handleCashSave = useCallback(
    async (value: number) => {
      const previousValue = cashBalance;
      setCashBalance(value);
      try {
        const res = await fetch("/api/trades/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cashBalance: value }),
        });
        if (!res.ok) {
          throw new Error("Failed to save cash balance");
        }
        router.refresh();
      } catch (error) {
        console.error("Failed to save cash balance:", error);
        // 에러 발생 시 이전 값으로 롤백
        setCashBalance(previousValue);
        // TODO: 사용자에게 에러 메시지 표시 (토스트 등)
        throw error; // 상위 컴포넌트에서 처리할 수 있도록 에러 전파
      }
    },
    [cashBalance, router]
  );

  const cashWeight = totalAssets > 0 ? (cashBalance / totalAssets) * 100 : 0;
  const positionWeight =
    totalAssets > 0 ? (totalPositionValue / totalAssets) * 100 : 0;

  // 종목별 비중 계산
  const positions: PositionItem[] = positionValues.map((p, i) => ({
    symbol: p.symbol,
    value: p.value,
    weight: totalAssets > 0 ? (p.value / totalAssets) * 100 : 0,
    color: STOCK_COLORS[i % STOCK_COLORS.length],
  }));

  // 도넛 차트 세그먼트 계산 (현금 + 각 종목)
  const segments = [
    { label: "현금", weight: cashWeight, color: CASH_COLOR },
    ...positions.map((p) => ({
      label: p.symbol,
      weight: p.weight,
      color: p.color,
    })),
  ].filter((s) => s.weight > 0);

  return (
    <div className="bg-white border rounded-md mb-3">
      <div className="grid grid-cols-2">
        {/* 좌측: 자산 현황 + 파이차트 */}
        <div className="p-4 border-r">
          <div className="flex gap-6">
            {/* 텍스트 정보 */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-medium text-gray-500 mb-2">
                💰 자산 현황
              </h3>

              <div className="mb-3">
                <span className="text-2xl font-bold">
                  {formatPositionValue(totalAssets)}
                </span>
              </div>

              {/* 현금 */}
              <div className="space-y-2 text-sm">
                <CashBalanceEditor
                  value={cashBalance}
                  weight={cashWeight}
                  onSave={handleCashSave}
                />

                {/* 포지션 */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">포지션</span>
                  <span className="text-gray-700">
                    {formatPositionValue(totalPositionValue)}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {formatPercent(positionWeight, 0)}
                  </span>
                  {openTrades.length > 0 && (
                    <span className="text-gray-400 text-xs">
                      ({openTrades.length}개)
                    </span>
                  )}
                </div>
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
