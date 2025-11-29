"use client";

import { useState } from "react";
import { MISTAKE_TAGS } from "@/db/schema";
import { CloseTradeRequest, MistakeTag } from "@/lib/trades/types";
import { Button } from "@/components/ui/button";

interface TradeCloseModalProps {
  tradeId: number;
  onClose: () => void;
  onClosed: () => void;
}

export default function TradeCloseModal({
  tradeId,
  onClose,
  onClosed,
}: TradeCloseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mistakeType, setMistakeType] = useState<MistakeTag | "">("");
  const [reviewNote, setReviewNote] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);

      const request: CloseTradeRequest = {
        mistakeType: mistakeType || undefined,
        reviewNote: reviewNote.trim() || undefined,
      };

      const res = await fetch(`/api/trades/${tradeId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "종료 실패");
      }

      onClosed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        {/* 헤더 */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">📝 매매 종료 & 복기</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 실수 태그 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이번 매매는 어땠나요?
            </label>
            <div className="flex flex-wrap gap-2">
              {MISTAKE_TAGS.map((tag) => {
                const isSuccess = tag === "원칙준수";
                const isSelected = mistakeType === tag;
                return (
                  <Button
                    key={tag}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMistakeType(isSelected ? "" : tag)}
                    className={
                      isSelected
                        ? isSuccess
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-amber-500 hover:bg-amber-600"
                        : isSuccess
                          ? "border-green-200 text-green-700 hover:bg-green-50"
                          : ""
                    }
                  >
                    {isSuccess && "✅ "}
                    {tag}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 복기 노트 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              복기 / 배운 점
            </label>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="이번 매매에서 배운 점, 다음에 개선할 점..."
              rows={4}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* 경고 */}
          <div className="p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">
            ⚠️ 매매를 종료하면 더 이상 매수/매도를 추가할 수 없습니다.
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
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "처리 중..." : "매매 종료"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
