"use client";

import { formatPrice, formatPercent } from "@/utils/format";

interface PriceBarLegendProps {
  stopLoss: number;
  avgEntryPrice: number;
  currentPrice: number;
  targets: Array<{ price: number; weight: number }>;
}

export default function PriceBarLegend({
  stopLoss,
  avgEntryPrice,
  currentPrice,
  targets,
}: PriceBarLegendProps) {
  const getPercent = (price: number): number | null => {
    if (avgEntryPrice <= 0) return null;
    return ((price - avgEntryPrice) / avgEntryPrice) * 100;
  };

  const currentPercent = getPercent(currentPrice);

  return (
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
        <span
          className={
            currentPrice >= avgEntryPrice ? "text-blue-600" : "text-red-500"
          }
        >
          {formatPrice(currentPrice)}
          {currentPercent !== null && (
            <> ({currentPercent >= 0 ? "+" : ""}{formatPercent(currentPercent, 1)})</>
          )}
        </span>
      </div>
      {targets.map((target, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
          <span className="text-gray-600">
            {targets.length > 1 ? `${index + 1}차 목표` : "목표"}
          </span>
          <span className="text-green-600">{formatPrice(target.price)}</span>
        </div>
      ))}
    </div>
  );
}

