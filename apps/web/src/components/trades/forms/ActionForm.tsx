"use client";

import { useState } from "react";
import { CreateActionRequest } from "@/lib/trades/types";
import { formatPrice, formatPercent } from "@/utils/format";
import { Button } from "@/components/ui/button";

interface ActionFormProps {
  tradeId: number;
  actionType: "BUY" | "SELL";
  currentQuantity: number;
  avgEntryPrice?: number;
  onClose: () => void;
  onCreated: () => void;
}

export default function ActionForm({
  tradeId,
  actionType,
  currentQuantity,
  avgEntryPrice = 0,
  onClose,
  onCreated,
}: ActionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [actionDate, setActionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState("");

  const isBuy = actionType === "BUY";

  // 평균가 대비 퍼센트 계산
  const priceNum = price ? parseFloat(price) : 0;
  const pricePercent =
    avgEntryPrice > 0 && priceNum > 0
      ? ((priceNum - avgEntryPrice) / avgEntryPrice) * 100
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const quantityNum = parseInt(quantity);

    if (!price || priceNum <= 0) {
      setError("가격을 입력해주세요");
      return;
    }

    if (!quantity || quantityNum <= 0) {
      setError("수량을 입력해주세요");
      return;
    }

    if (!isBuy && quantityNum > currentQuantity) {
      setError(`보유 수량(${currentQuantity}주)을 초과할 수 없습니다`);
      return;
    }

    try {
      setLoading(true);

      const request: CreateActionRequest = {
        actionType,
        price: priceNum,
        quantity: quantityNum,
        actionDate: actionDate || undefined,
        note: note.trim() || undefined,
      };

      const res = await fetch(`/api/trades/${tradeId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "추가 실패");
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  };

  const handleSellAll = () => {
    setQuantity(currentQuantity.toString());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        {/* 헤더 */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2
            className={`text-lg font-bold ${
              isBuy ? "text-green-600" : "text-red-600"
            }`}
          >
            {isBuy ? "📈 매수 추가" : "📉 매도 추가"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isBuy && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              현재 보유:{" "}
              <span className="font-semibold">{currentQuantity}주</span>
              {avgEntryPrice > 0 && (
                <span className="text-gray-500 ml-2">
                  (평균가 {formatPrice(avgEntryPrice)})
                </span>
              )}
            </div>
          )}

          {/* 가격 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isBuy ? "매수" : "매도"} 가격 *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                $
              </span>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
            </div>
            {pricePercent !== null && (
              <p
                className={`text-xs mt-1 ${pricePercent > 0 ? "text-green-500" : pricePercent < 0 ? "text-red-500" : "text-gray-500"}`}
              >
                평균가 대비 {pricePercent >= 0 ? "+" : ""}
                {formatPercent(pricePercent, 1)}
              </p>
            )}
          </div>

          {/* 수량 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              수량 *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {!isBuy && currentQuantity > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSellAll}
                  className="h-auto py-2.5"
                >
                  전량
                </Button>
              )}
            </div>
          </div>

          {/* 날짜 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isBuy ? "매수일" : "매도일"}
            </label>
            <input
              type="date"
              value={actionDate}
              onChange={(e) => setActionDate(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              메모
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isBuy ? "예: 불타기" : "예: 1차 익절"}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* 에러 */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`flex-1 ${
                isBuy
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {loading ? "처리 중..." : isBuy ? "매수 추가" : "매도 추가"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
