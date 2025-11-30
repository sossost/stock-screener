"use client";

import { formatPositionValue, formatDateKr } from "@/utils/format";

interface AssetSnapshot {
  date: string;
  totalAssets: number;
  cash: number;
  positionValue: number;
}

interface AssetFlowTooltipProps {
  data: AssetSnapshot;
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
    typeof window !== "undefined" ? window.innerWidth - tooltipWidth - margin : position.x + margin
  );
  const top = Math.max(
    position.y - tooltipHeight - margin,
    margin
  );

  return (
    <div
      className="fixed bg-white border rounded shadow-lg p-2 text-xs z-50 pointer-events-none"
      style={{ left, top }}
    >
      <p className="text-gray-500 mb-1">{formatDateKr(data.date)}</p>
      <p className="font-semibold text-red-600">
        {formatPositionValue(data.totalAssets)}
      </p>
      <div className="flex gap-2 mt-1 text-gray-400 text-[10px]">
        <span>현금: {formatPositionValue(data.cash)}</span>
        <span>포지션: {formatPositionValue(data.positionValue)}</span>
      </div>
    </div>
  );
}

