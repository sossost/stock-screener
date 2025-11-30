"use client";

import { formatPercent } from "@/utils/format";
import type { Segment } from "../types";

interface AssetAllocationLegendProps {
  segments: Segment[];
}

export default function AssetAllocationLegend({
  segments,
}: AssetAllocationLegendProps) {
  if (segments.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t flex flex-wrap gap-x-4 gap-y-1">
      {segments.map((seg) => (
        <div key={seg.label} className="flex items-center gap-1.5 text-xs">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: seg.color }}
          />
          <span className="text-gray-600 font-medium">{seg.label}</span>
          <span className="text-gray-400">{formatPercent(seg.weight, 0)}</span>
        </div>
      ))}
    </div>
  );
}

