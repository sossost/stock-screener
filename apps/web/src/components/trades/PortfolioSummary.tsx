"use client";

import { useState, useEffect } from "react";
import { TradeListItem } from "@/lib/trades/types";
import { formatPositionValue, formatPercent } from "@/utils/format";

interface PortfolioSummaryProps {
  trades: TradeListItem[];
  onTotalAssetsChange?: (totalAssets: number) => void;
}

const CASH_STORAGE_KEY = "portfolio_cash_balance";

export default function PortfolioSummary({ trades, onTotalAssetsChange }: PortfolioSummaryProps) {
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(CASH_STORAGE_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) setCashBalance(parsed);
    }
  }, []);

  const openTrades = trades.filter((t) => t.status === "OPEN");

  // 포지션별 가치 계산
  const positionValues = openTrades.map((trade) => {
    const currentPrice = trade.currentPrice || 0;
    const quantity = trade.calculated.currentQuantity;
    const value = currentPrice > 0
      ? currentPrice * quantity
      : trade.calculated.avgEntryPrice * quantity;
    return { symbol: trade.symbol, value };
  });

  const totalPositionValue = positionValues.reduce((sum, p) => sum + p.value, 0);
  const totalAssets = cashBalance + totalPositionValue;

  useEffect(() => {
    onTotalAssetsChange?.(totalAssets);
  }, [totalAssets, onTotalAssetsChange]);

  const handleEditClick = () => {
    setInputValue(cashBalance > 0 ? cashBalance.toString() : "");
    setIsEditing(true);
  };

  const handleSave = () => {
    const value = parseFloat(inputValue);
    if (!isNaN(value) && value >= 0) {
      setCashBalance(value);
      localStorage.setItem(CASH_STORAGE_KEY, value.toString());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    else if (e.key === "Escape") setIsEditing(false);
  };

  const cashWeight = totalAssets > 0 ? (cashBalance / totalAssets) * 100 : 0;
  const positionWeight = totalAssets > 0 ? (totalPositionValue / totalAssets) * 100 : 0;

  return (
    <div className="bg-white border rounded-md p-4 mb-3">
      <div className="flex gap-6">
        {/* 좌측: 자산 요약 */}
        <div className="flex-1">
          <h3 className="text-xs font-medium text-gray-500 mb-2">💰 자산 현황</h3>
          
          {/* 자산 총계 (큰 글씨) */}
          <div className="mb-3">
            <span className="text-2xl font-bold">{formatPositionValue(totalAssets)}</span>
          </div>

          {/* 현금 / 포지션 */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-gray-600">현금</span>
              {isEditing ? (
                <div className="flex items-center">
                  <span className="text-gray-400">$</span>
                  <input
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    className="w-20 border rounded px-1 py-0.5 text-sm"
                    autoFocus
                    placeholder="0"
                  />
                </div>
              ) : (
                <button
                  onClick={handleEditClick}
                  className="hover:text-blue-600"
                  title="현금 수정"
                >
                  {formatPositionValue(cashBalance)}
                </button>
              )}
              <span className="text-gray-400 text-xs">{formatPercent(cashWeight, 0)}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-600">포지션</span>
              <span className="text-blue-600">{formatPositionValue(totalPositionValue)}</span>
              <span className="text-gray-400 text-xs">{formatPercent(positionWeight, 0)}</span>
              {openTrades.length > 0 && (
                <span className="text-gray-400 text-xs">({openTrades.length}개)</span>
              )}
            </div>
          </div>
        </div>

        {/* 우측: 차트 영역 (추후 확장) */}
        <div className="w-48 flex items-center justify-center">
          {totalAssets > 0 ? (
            <div className="relative w-20 h-20">
              {/* 간단한 도넛 차트 */}
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {/* 배경 원 */}
                <circle
                  cx="18" cy="18" r="15.5"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                {/* 포지션 비중 */}
                <circle
                  cx="18" cy="18" r="15.5"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeDasharray={`${positionWeight} ${100 - positionWeight}`}
                  strokeLinecap="round"
                />
              </svg>
              {/* 중앙 텍스트 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  {formatPercent(positionWeight, 0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 text-center">
              자산 데이터 없음
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
