"use client";

import { TradeAction } from "@/lib/trades/types";

interface ActionTimelineProps {
  actions: TradeAction[];
  avgEntryPrice: number;
}

export default function ActionTimeline({
  actions,
  avgEntryPrice,
}: ActionTimelineProps) {
  if (actions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        아직 매매 내역이 없습니다
      </div>
    );
  }

  // 날짜순 정렬 (오래된 순)
  const sortedActions = [...actions].sort(
    (a, b) =>
      new Date(a.actionDate).getTime() - new Date(b.actionDate).getTime()
  );

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {sortedActions.map((action, index) => {
        const isBuy = action.actionType === "BUY";
        const price = parseFloat(action.price);
        const amount = price * action.quantity;

        // 매도 시 손익 계산
        const pnlPerShare = isBuy ? 0 : price - avgEntryPrice;
        const pnl = isBuy ? 0 : pnlPerShare * action.quantity;

        return (
          <div key={action.id} className="flex gap-4">
            {/* 타임라인 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full ${
                  isBuy ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {index < sortedActions.length - 1 && (
                <div className="w-0.5 flex-1 bg-gray-200 my-1" />
              )}
            </div>

            {/* 내용 */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${
                        isBuy ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isBuy ? "매수" : "매도"}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(action.actionDate)} {formatTime(action.actionDate)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm">
                    <span className="text-gray-600">
                      ${price.toFixed(2)} × {action.quantity}주
                    </span>
                    <span className="text-gray-400 mx-2">=</span>
                    <span className="font-medium">${amount.toFixed(0)}</span>
                  </div>
                  {action.note && (
                    <p className="mt-1 text-sm text-gray-500">{action.note}</p>
                  )}
                </div>

                {/* 매도 시 손익 표시 */}
                {!isBuy && pnl !== 0 && (
                  <div
                    className={`text-right ${
                      pnl > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    <div className="font-medium">
                      {pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}
                    </div>
                    <div className="text-xs">
                      {pnlPerShare >= 0 ? "+" : ""}${pnlPerShare.toFixed(2)}/주
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

