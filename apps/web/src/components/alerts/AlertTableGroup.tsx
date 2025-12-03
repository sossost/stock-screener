"use client";

import React from "react";
import type { ScreenerCompany } from "@/types/screener";
import { StockTable } from "@/components/screener/StockTable";
import type { FilterState } from "@/lib/filters/summary";
import { formatDateWithWeekday } from "@/utils/format";

interface AlertsByDate {
  date: string; // 'YYYY-MM-DD'
  alertType: string;
  alerts: ScreenerCompany[];
}

interface AlertTableGroupProps {
  alertsByDate: AlertsByDate[];
}

/**
 * 날짜별 알림 테이블 그룹 컴포넌트
 * 최신 날짜부터 세로로 배치하여 표시
 */
export function AlertTableGroup({ alertsByDate }: AlertTableGroupProps) {
  if (alertsByDate.length === 0) {
    return null;
  }

  // 빈 FilterState (스크리너 테이블에 필요한 props)
  const emptyFilterState: FilterState = {};

  return (
    <div className="space-y-4">
      {alertsByDate.map(({ date, alerts }) => (
        <div key={date} className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            {formatDateWithWeekday(date)}
          </h2>
          <StockTable
            data={alerts}
            filterState={emptyFilterState}
            totalCount={alerts.length}
          />
        </div>
      ))}
    </div>
  );
}
