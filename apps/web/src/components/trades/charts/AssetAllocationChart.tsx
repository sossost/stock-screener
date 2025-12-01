"use client";

import type { Segment } from "../types";

interface AssetAllocationChartProps {
  segments: Segment[];
  totalPositions: number;
  size?: number;
  strokeWidth?: number;
}

export default function AssetAllocationChart({
  segments,
  totalPositions,
  size = 96,
  strokeWidth = 4,
}: AssetAllocationChartProps) {
  if (segments.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-gray-400 border-2 border-dashed rounded-full"
        style={{ width: size, height: size }}
      >
        -
      </div>
    );
  }

  const radius = 15.5;
  const viewBoxSize = 36;

  // 세그먼트 렌더링 데이터 계산 (IIFE 대신 useMemo 사용)
  const segmentElements = segments.map((seg, index) => {
    const offset = segments
      .slice(0, index)
      .reduce((sum, s) => sum + s.weight, 0);
    const dashArray = `${seg.weight} ${100 - seg.weight}`;
    const dashOffset = -offset;
    return (
      <circle
        key={seg.label}
        cx={viewBoxSize / 2}
        cy={viewBoxSize / 2}
        r={radius}
        fill="none"
        stroke={seg.color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
      />
    );
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full -rotate-90"
      >
        {segmentElements}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-semibold text-gray-800">
          {totalPositions}
        </span>
        <span className="text-[10px] text-gray-500">종목</span>
      </div>
    </div>
  );
}
