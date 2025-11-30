"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TradeWithDetails, PlanTarget, StrategyTag, MistakeTag, UpdateTradeRequest } from "@/lib/trades/types";
import { STRATEGY_TAGS, MISTAKE_TAGS } from "@/db/schema";

interface TradeEditModalProps {
  trade: TradeWithDetails;
  onClose: () => void;
  onUpdated: () => void;
}

export default function TradeEditModal({ trade, onClose, onUpdated }: TradeEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 폼 상태
  const [strategy, setStrategy] = useState<StrategyTag | "">((trade.strategy as StrategyTag) || "");
  const [planEntryPrice, setPlanEntryPrice] = useState(trade.planEntryPrice || "");
  const [planStopLoss, setPlanStopLoss] = useState(trade.planStopLoss || "");
  const [entryReason, setEntryReason] = useState(trade.entryReason || "");
  const [commissionRate, setCommissionRate] = useState(trade.commissionRate || "0.07");

  // n차 목표가
  const initialTargets: PlanTarget[] = trade.planTargets && trade.planTargets.length > 0
    ? trade.planTargets
    : trade.planTargetPrice
      ? [{ price: parseFloat(trade.planTargetPrice), weight: 100 }]
      : [{ price: 0, weight: 100 }];
  const [targets, setTargets] = useState<PlanTarget[]>(initialTargets);

  // 복기 (CLOSED인 경우)
  const [mistakeType, setMistakeType] = useState<MistakeTag | "">((trade.mistakeType as MistakeTag) || "");
  const [reviewNote, setReviewNote] = useState(trade.reviewNote || "");

  const isOpen = trade.status === "OPEN";

  const handleAddTarget = () => {
    const remainingWeight = 100 - targets.reduce((sum, t) => sum + t.weight, 0);
    setTargets([...targets, { price: 0, weight: Math.max(0, remainingWeight) }]);
  };

  const handleRemoveTarget = (index: number) => {
    if (targets.length <= 1) return;
    setTargets(targets.filter((_, i) => i !== index));
  };

  const handleTargetChange = (index: number, field: "price" | "weight", value: string) => {
    const newTargets = [...targets];
    newTargets[index] = {
      ...newTargets[index],
      [field]: parseFloat(value) || 0,
    };
    setTargets(newTargets);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body: UpdateTradeRequest = {
        strategy: strategy || undefined,
        planEntryPrice: planEntryPrice ? parseFloat(String(planEntryPrice)) : undefined,
        planStopLoss: planStopLoss ? parseFloat(String(planStopLoss)) : undefined,
        planTargets: targets.filter((t) => t.price > 0),
        entryReason: entryReason || undefined,
        commissionRate: commissionRate ? parseFloat(String(commissionRate)) : undefined,
      };

      // CLOSED인 경우 복기 정보 추가
      if (!isOpen) {
        body.mistakeType = mistakeType || undefined;
        body.reviewNote = reviewNote || undefined;
      }

      const res = await fetch(`/api/trades/${trade.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "수정 실패");
      }

      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">매매 수정</h2>
            <p className="text-sm text-gray-500">{trade.symbol}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* 전략 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              전략
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as StrategyTag)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">선택</option>
              {STRATEGY_TAGS.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* 계획 진입가 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              계획 진입가 ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={planEntryPrice}
              onChange={(e) => setPlanEntryPrice(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>

          {/* 손절가 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              손절가 ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={planStopLoss}
              onChange={(e) => setPlanStopLoss(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>

          {/* n차 목표가 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">목표가</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddTarget}
                className="text-xs"
              >
                + 목표 추가
              </Button>
            </div>
            <div className="space-y-2">
              {targets.map((target, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8">{index + 1}차</span>
                  <input
                    type="number"
                    step="0.01"
                    value={target.price || ""}
                    onChange={(e) => handleTargetChange(index, "price", e.target.value)}
                    className="flex-1 border rounded-md px-3 py-2 text-sm"
                    placeholder="가격"
                  />
                  <input
                    type="number"
                    value={target.weight || ""}
                    onChange={(e) => handleTargetChange(index, "weight", e.target.value)}
                    className="w-20 border rounded-md px-3 py-2 text-sm"
                    placeholder="%"
                  />
                  <span className="text-xs text-gray-500">%</span>
                  {targets.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTarget(index)}
                      className="text-red-500 hover:text-red-600 px-2"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 수수료율 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              수수료율 (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="0.07"
            />
          </div>

          {/* 진입 근거 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              진입 근거
            </label>
            <textarea
              value={entryReason}
              onChange={(e) => setEntryReason(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm resize-none"
              rows={3}
              placeholder="진입 근거를 입력하세요"
            />
          </div>

          {/* 복기 (CLOSED인 경우) */}
          {!isOpen && (
            <>
              <div className="border-t pt-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📝 매매 복기</h3>
                
                {/* 실수 태그 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    실수 태그
                  </label>
                  <select
                    value={mistakeType}
                    onChange={(e) => setMistakeType(e.target.value as MistakeTag)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">선택</option>
                    {MISTAKE_TAGS.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>

                {/* 복기 노트 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    복기 노트
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm resize-none"
                    rows={4}
                    placeholder="매매를 복기해보세요"
                  />
                </div>
              </div>
            </>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

