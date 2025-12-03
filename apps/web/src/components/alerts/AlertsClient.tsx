"use client";

import React, { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/config/constants";
import { AlertTableGroup } from "./AlertTableGroup";
import { StateMessage } from "@/components/common/StateMessage";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Card, CardContent } from "@/components/ui/card";
import type { ScreenerCompany } from "@/types/screener";
import {
  ALERT_TYPES,
  ALERT_TYPE_LABELS,
  type AlertType,
} from "@/lib/alerts/constants";

interface AlertsByDate {
  date: string;
  alertType: string;
  alerts: ScreenerCompany[];
}

interface AlertsResponse {
  alertsByDate: AlertsByDate[];
  totalDates: number;
  alertType: string;
}

async function fetchAlerts(alertType: AlertType): Promise<AlertsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/alerts?alertType=${alertType}`,
    {
      next: { revalidate: 60 },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 알림 목록 클라이언트 컴포넌트
 * 날짜별로 그룹화된 알림을 표시
 */
export function AlertsClient() {
  const [selectedAlertType, setSelectedAlertType] = useState<AlertType>(
    ALERT_TYPES.MA20_BREAKOUT_ORDERED
  );

  const { data, error } = useSuspenseQuery({
    queryKey: ["alerts", selectedAlertType],
    queryFn: () => fetchAlerts(selectedAlertType),
  });

  const alertTypeTabs = Object.values(ALERT_TYPES).map((type) => ({
    value: type,
    label: ALERT_TYPE_LABELS[type],
  }));

  if (error) {
    return (
      <StateMessage
        variant="error"
        title="알림을 불러오지 못했습니다"
        description={
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다"
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <FilterTabs
        tabs={alertTypeTabs}
        value={selectedAlertType}
        onChange={(value) => setSelectedAlertType(value as AlertType)}
      />

      {!data || data.alertsByDate.length === 0 ? (
        <Card className="px-4 pb-4">
          <CardContent className="px-4 pt-4">
            <StateMessage
              variant="info"
              title="알림이 없습니다"
              description={`${ALERT_TYPE_LABELS[selectedAlertType]} 알림이 발생하면 여기에 표시됩니다`}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.alertsByDate.map(({ date, alerts }) => (
            <Card key={date} className="px-4 pb-4">
              <CardContent className="px-4 pt-4">
                <AlertTableGroup
                  alertsByDate={[{ date, alerts, alertType: data.alertType }]}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
