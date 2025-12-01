"use client";

interface PriceBarChartProps {
  stopLoss: number;
  avgEntryPrice: number;
  currentPrice: number;
  targets: number[];
  chartMin: number;
  chartMax: number;
}

export default function PriceBarChart({
  stopLoss,
  avgEntryPrice,
  currentPrice,
  targets,
  chartMin,
  chartMax,
}: PriceBarChartProps) {
  const chartRange = chartMax - chartMin;

  const getPosition = (price: number) => {
    if (chartRange === 0) return 50;
    const pos = ((price - chartMin) / chartRange) * 100;
    return Math.max(0, Math.min(100, pos));
  };

  return (
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
          style={{
            left: `${getPosition(avgEntryPrice)}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      )}

      {/* 현재가 점 */}
      {currentPrice > 0 && (
        <div
          className="absolute top-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow z-20"
          style={{
            left: `${getPosition(currentPrice)}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      )}

      {/* 목표가 점 */}
      {targets.map((target) => (
        <div
          key={`target-${target}`}
          className="absolute top-1/2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow"
          style={{
            left: `${getPosition(target)}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}
