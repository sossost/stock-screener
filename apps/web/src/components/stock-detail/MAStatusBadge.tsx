"use client";

import type { StockMAStatus } from "@/types/stock-detail";

interface MAStatusBadgeProps {
  status: StockMAStatus;
}

export function MAStatusBadge({ status }: MAStatusBadgeProps) {
  if (!status.ordered && !status.goldenCross) {
    return null;
  }

  return (
    <div className="flex gap-2">
      {status.ordered && (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
          정배열
        </span>
      )}
      {status.goldenCross && (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          골든크로스
        </span>
      )}
    </div>
  );
}
