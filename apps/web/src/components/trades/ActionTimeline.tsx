"use client";

import { useState } from "react";
import { TradeAction } from "@/lib/trades/types";
import {
  formatPrice,
  formatPnl,
  formatQuantity,
  formatDateKr,
} from "@/utils/format";
import { Button } from "@/components/ui/button";
import ActionEditModal from "./modals/ActionEditModal";

interface ActionTimelineProps {
  actions: TradeAction[];
  avgEntryPrice: number;
  tradeId: number;
  isClosed?: boolean;
  onActionUpdated?: () => void;
}

export default function ActionTimeline({
  actions,
  avgEntryPrice,
  tradeId,
  isClosed = false,
  onActionUpdated,
}: ActionTimelineProps) {
  const [editingAction, setEditingAction] = useState<TradeAction | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDelete = async (actionId: number) => {
    if (!confirm("이 매매 내역을 삭제하시겠습니까?")) return;

    setDeletingId(actionId);
    try {
      const res = await fetch(`/api/trades/${tradeId}/actions/${actionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "삭제 실패");
      }

      onActionUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditClose = () => {
    setEditingAction(null);
  };

  const handleEditUpdated = () => {
    setEditingAction(null);
    onActionUpdated?.();
  };

  const canDelete = actions.length > 1 && !isClosed;

  return (
    <>
      <div className="space-y-4">
        {sortedActions.map((action, index) => {
          const isBuy = action.actionType === "BUY";
          const price = parseFloat(action.price);
          const amount = price * action.quantity;

          // 매도 시 손익 계산
          const pnlPerShare = isBuy ? 0 : price - avgEntryPrice;
          const pnl = isBuy ? 0 : pnlPerShare * action.quantity;

          return (
            <div key={action.id} className="flex gap-4 group">
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          isBuy ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isBuy ? "매수" : "매도"}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDateKr(action.actionDate)}{" "}
                        {formatTime(action.actionDate)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="text-gray-600">
                        {formatPrice(price)} × {formatQuantity(action.quantity)}
                        주
                      </span>
                      <span className="text-gray-400 mx-2">=</span>
                      <span className="font-medium">{formatPrice(amount)}</span>
                    </div>
                    {action.note && (
                      <p className="mt-1 text-sm text-gray-500">
                        {action.note}
                      </p>
                    )}
                  </div>

                  {/* 매도 시 손익 표시 */}
                  {!isBuy && pnl !== 0 && (
                    <div
                      className={`text-right mr-2 ${
                        pnl > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      <div className="font-medium">{formatPnl(pnl)}</div>
                      <div className="text-xs">{formatPnl(pnlPerShare)}/주</div>
                    </div>
                  )}

                  {/* 수정/삭제 버튼 */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingAction(action)}
                      className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      수정
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(action.id)}
                        disabled={deletingId === action.id}
                        className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        {deletingId === action.id ? "..." : "삭제"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 수정 모달 */}
      {editingAction && (
        <ActionEditModal
          tradeId={tradeId}
          action={editingAction}
          onClose={handleEditClose}
          onUpdated={handleEditUpdated}
        />
      )}
    </>
  );
}
