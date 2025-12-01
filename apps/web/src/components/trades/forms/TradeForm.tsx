"use client";

import { useState, useEffect } from "react";
import { STRATEGY_TAGS } from "@/db/schema";
import {
  CreateTradeRequest,
  StrategyTag,
  PlanTarget,
} from "@/lib/trades/types";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { DEFAULT_COMMISSION_RATE } from "@/lib/trades/calculations";
import { formatPercent } from "@/utils/format";

const COMMISSION_RATE_KEY = "trading-journal-commission-rate";

interface TradeFormProps {
  onClose: () => void;
  onCreated: () => void;
  defaultSymbol?: string;
}

export default function TradeForm({
  onClose,
  onCreated,
  defaultSymbol,
}: TradeFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState(defaultSymbol || "");
  const [strategy, setStrategy] = useState<StrategyTag | "">("");
  const [planStopLoss, setPlanStopLoss] = useState("");
  const [planTargets, setPlanTargets] = useState<
    { price: string; weight: string }[]
  >([{ price: "", weight: "100" }]);
  const [entryReason, setEntryReason] = useState("");
  const [commissionRate, setCommissionRate] = useState(
    DEFAULT_COMMISSION_RATE.toString()
  );

  // 저장된 수수료율 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(COMMISSION_RATE_KEY);
    if (saved) {
      setCommissionRate(saved);
    }
  }, []);

  // 첫 매수 정보
  const [includeFirstBuy, setIncludeFirstBuy] = useState(true);
  const [firstBuyPrice, setFirstBuyPrice] = useState("");
  const [firstBuyQuantity, setFirstBuyQuantity] = useState("");
  const [firstBuyDate, setFirstBuyDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [firstBuyNote, setFirstBuyNote] = useState("");

  // 평균가 대비 퍼센트 계산
  const entryPrice = firstBuyPrice ? parseFloat(firstBuyPrice) : 0;
  const stopLossPercent =
    entryPrice > 0 && planStopLoss
      ? ((parseFloat(planStopLoss) - entryPrice) / entryPrice) * 100
      : null;

  const getTargetPercent = (targetPrice: string) => {
    if (entryPrice > 0 && targetPrice) {
      return ((parseFloat(targetPrice) - entryPrice) / entryPrice) * 100;
    }
    return null;
  };

  const addTarget = () => {
    setPlanTargets([...planTargets, { price: "", weight: "" }]);
  };

  const removeTarget = (index: number) => {
    if (planTargets.length > 1) {
      setPlanTargets(planTargets.filter((_, i) => i !== index));
    }
  };

  const updateTarget = (
    index: number,
    field: "price" | "weight",
    value: string
  ) => {
    const updated = [...planTargets];
    updated[index][field] = value;
    setPlanTargets(updated);
  };

  const totalWeight = planTargets.reduce(
    (sum, t) => sum + (parseFloat(t.weight) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!symbol.trim()) {
      setError("종목 심볼을 입력해주세요");
      return;
    }

    if (includeFirstBuy) {
      if (!firstBuyPrice || parseFloat(firstBuyPrice) <= 0) {
        setError("매수 가격을 입력해주세요");
        return;
      }
      if (!firstBuyQuantity || parseInt(firstBuyQuantity) <= 0) {
        setError("매수 수량을 입력해주세요");
        return;
      }
    }

    // 목표가 검증
    const validTargets = planTargets.filter(
      (t) => t.price && parseFloat(t.price) > 0
    );
    if (validTargets.length > 0 && totalWeight !== 100) {
      setError(`목표 비중 합계가 100%여야 합니다 (현재: ${totalWeight}%)`);
      return;
    }

    try {
      setLoading(true);

      const targets: PlanTarget[] = validTargets.map((t) => ({
        price: parseFloat(t.price),
        weight: parseFloat(t.weight) || 0,
      }));

      // 수수료율 저장 (다음 매매의 기본값으로 사용)
      const rate = parseFloat(commissionRate) || DEFAULT_COMMISSION_RATE;
      localStorage.setItem(COMMISSION_RATE_KEY, rate.toString());

      const request: CreateTradeRequest = {
        symbol: symbol.toUpperCase().trim(),
        strategy: strategy || undefined,
        planStopLoss: planStopLoss ? parseFloat(planStopLoss) : undefined,
        planTargetPrice: targets[0]?.price, // 하위호환: 1차 목표가
        planTargets: targets.length > 0 ? targets : undefined,
        entryReason: entryReason.trim() || undefined,
        commissionRate: rate,
      };

      if (includeFirstBuy && firstBuyPrice && firstBuyQuantity) {
        request.firstAction = {
          price: parseFloat(firstBuyPrice),
          quantity: parseInt(firstBuyQuantity),
          actionDate: firstBuyDate || undefined,
          note: firstBuyNote.trim() || undefined,
        };
      }

      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "매매 생성 실패");
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold">새 매매 시작</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 종목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종목 심볼 *
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoFocus
            />
          </div>

          {/* 전략 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              매매 전략
            </label>
            <div className="flex flex-wrap gap-2">
              {STRATEGY_TAGS.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  variant={strategy === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStrategy(strategy === tag ? "" : tag)}
                  className={
                    strategy === tag ? "bg-blue-500 hover:bg-blue-600" : ""
                  }
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>

          {/* 손절가 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              손절가 (R 계산용)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                $
              </span>
              <input
                type="number"
                step="0.01"
                value={planStopLoss}
                onChange={(e) => setPlanStopLoss(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            {stopLossPercent !== null && (
              <p
                className={`text-xs mt-1 ${stopLossPercent < 0 ? "text-red-500" : "text-green-500"}`}
              >
                진입가 대비 {stopLossPercent >= 0 ? "+" : ""}
                {formatPercent(stopLossPercent, 1)}
              </p>
            )}
          </div>

          {/* n차 목표가 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                목표가 (비중 합계: {totalWeight}%)
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addTarget}
                className="h-7 px-2 text-blue-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            </div>
            <div className="space-y-2">
              {planTargets.map((target, index) => {
                const percent = getTargetPercent(target.price);
                return (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={target.price}
                            onChange={(e) =>
                              updateTarget(index, "price", e.target.value)
                            }
                            placeholder={`${index + 1}차 목표가`}
                            className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                          />
                        </div>
                        <div className="relative w-24">
                          <input
                            type="number"
                            value={target.weight}
                            onChange={(e) =>
                              updateTarget(index, "weight", e.target.value)
                            }
                            placeholder="비중"
                            className="w-full pl-3 pr-7 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                            %
                          </span>
                        </div>
                      </div>
                      {percent !== null && (
                        <p
                          className={`text-xs mt-0.5 ${percent > 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          진입가 대비 {percent >= 0 ? "+" : ""}
                          {formatPercent(percent, 1)}
                        </p>
                      )}
                    </div>
                    {planTargets.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTarget(index)}
                        className="h-9 w-9 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 진입 이유 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              진입 근거
            </label>
            <textarea
              value={entryReason}
              onChange={(e) => setEntryReason(e.target.value)}
              placeholder="왜 이 종목에 진입하는가?"
              rows={3}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* 수수료율 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              수수료율 (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="0.07"
                className="w-full pl-4 pr-8 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                %
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              한 번 입력하면 다음 매매에도 기본값으로 적용됩니다
            </p>
          </div>

          {/* 구분선 */}
          <div className="border-t pt-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeFirstBuy}
                onChange={(e) => setIncludeFirstBuy(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                첫 매수 기록 포함
              </span>
            </label>
          </div>

          {/* 첫 매수 정보 */}
          {includeFirstBuy && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    매수 가격 *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={firstBuyPrice}
                      onChange={(e) => setFirstBuyPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    수량 *
                  </label>
                  <input
                    type="number"
                    value={firstBuyQuantity}
                    onChange={(e) => setFirstBuyQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  매수일
                </label>
                <input
                  type="date"
                  value={firstBuyDate}
                  onChange={(e) => setFirstBuyDate(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메모
                </label>
                <input
                  type="text"
                  value={firstBuyNote}
                  onChange={(e) => setFirstBuyNote(e.target.value)}
                  placeholder="예: 1차 진입"
                  className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                />
              </div>
            </div>
          )}

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
              {loading ? "생성 중..." : "매매 시작"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
