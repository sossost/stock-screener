"use client";

import { formatPnl, formatDateKr } from "@/utils/format";

interface PnlSnapshot {
  date: string;
  realizedPnl: number;
}

interface AssetFlowTooltipProps {
  data: PnlSnapshot;
  position: { x: number; y: number };
}

export default function AssetFlowTooltip({
  data,
  position,
}: AssetFlowTooltipProps) {
  // 화면 경계 체크 (툴팁이 화면 밖으로 나가지 않도록)
  const tooltipWidth = 200; // 대략적인 툴팁 너비
  const tooltipHeight = 100; // 대략적인 툴팁 높이
  const margin = 10;

  const left = Math.min(
    position.x + margin,
    typeof window !== "undefined"
      ? window.innerWidth - tooltipWidth - margin
      : position.x + margin
  );
  const top = Math.max(position.y - tooltipHeight - margin, margin);

  return (
    <div
      className="fixed bg-white border rounded shadow-lg p-2 text-xs z-50 pointer-events-none"
      style={{ left, top }}
    >
      <p className="text-gray-500 mb-1">{formatDateKr(data.date)}</p>
      <p
        className={`font-semibold ${
          data.realizedPnl >= 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        {formatPnl(data.realizedPnl)}
      </p>
    </div>
  );
}
