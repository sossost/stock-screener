"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TradeWithDetails } from "@/lib/trades/types";
import ActionTimeline from "@/components/trades/ActionTimeline";
import ActionForm from "@/components/trades/ActionForm";
import TradeCloseModal from "@/components/trades/TradeCloseModal";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

// 상세 페이지 스켈레톤
function TradeDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse" />
                </div>
                <div className="h-5 w-32 bg-gray-100 rounded mt-1 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-16 bg-green-100 rounded-md animate-pulse" />
              <div className="h-8 w-16 bg-red-100 rounded-md animate-pulse" />
              <div className="h-8 w-20 bg-gray-100 rounded-md animate-pulse" />
              <div className="h-8 w-12 bg-gray-100 rounded-md animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 손익 요약 스켈레톤 */}
        <section className="bg-white rounded-xl border p-6 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-5 w-16 bg-gray-100 rounded mb-1" />
                <div className="h-7 w-24 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="h-5 w-28 bg-gray-100 rounded" />
          </div>
        </section>

        {/* 계획 스켈레톤 */}
        <section className="bg-white rounded-xl border p-6 animate-pulse">
          <div className="h-6 w-24 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-5 w-12 bg-gray-100 rounded mb-0.5" />
                <div className="h-5 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </section>

        {/* 매매 내역 스켈레톤 */}
        <section className="bg-white rounded-xl border p-6 animate-pulse">
          <div className="h-6 w-24 bg-gray-200 rounded mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="h-8 w-8 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-5 w-32 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-48 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

interface TradeDetailClientProps {
  tradeId: string;
}

export default function TradeDetailClient({ tradeId }: TradeDetailClientProps) {
  const router = useRouter();
  const [trade, setTrade] = useState<TradeWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActionForm, setShowActionForm] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actionType, setActionType] = useState<"BUY" | "SELL">("BUY");

  const fetchTrade = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trades/${tradeId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("매매를 찾을 수 없습니다");
        throw new Error("조회 실패");
      }
      const data = await res.json();
      setTrade(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  }, [tradeId]);

  useEffect(() => {
    fetchTrade();
  }, [fetchTrade]);

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까? 모든 매매 내역이 삭제됩니다.")) return;

    try {
      const res = await fetch(`/api/trades/${tradeId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      router.push("/trades");
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  const handleActionCreated = () => {
    setShowActionForm(false);
    fetchTrade();
  };

  const handleTradeClosed = () => {
    setShowCloseModal(false);
    fetchTrade();
  };

  const openAddAction = (type: "BUY" | "SELL") => {
    setActionType(type);
    setShowActionForm(true);
  };

  if (loading) {
    return <TradeDetailSkeleton />;
  }

  if (error || !trade) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorState
          message={error || "매매를 찾을 수 없습니다"}
          backHref="/trades"
          backLabel="매매일지로 돌아가기"
        />
      </div>
    );
  }

  const isOpen = trade.status === "OPEN";
  const { avgEntryPrice, currentQuantity, realizedPnl, realizedRoi, rMultiple } =
    trade.calculated;

  const currentPrice = trade.symbolInfo?.currentPrice || 0;
  const unrealizedPnl =
    isOpen && currentPrice && currentQuantity > 0
      ? (currentPrice - avgEntryPrice) * currentQuantity
      : 0;
  const unrealizedRoi =
    isOpen && avgEntryPrice > 0 && currentQuantity > 0
      ? unrealizedPnl / (avgEntryPrice * currentQuantity)
      : 0;

  const displayPnl = isOpen ? unrealizedPnl : realizedPnl;
  const displayRoi = isOpen ? unrealizedRoi : realizedRoi;

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/trades"
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ← 뒤로
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{trade.symbol}</h1>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isOpen
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {isOpen ? "진행중" : "완료"}
                  </span>
                </div>
                {trade.symbolInfo?.companyName && (
                  <p className="text-sm text-gray-500">
                    {trade.symbolInfo.companyName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOpen && (
                <>
                  <Button
                    size="sm"
                    onClick={() => openAddAction("BUY")}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    + 매수
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openAddAction("SELL")}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    + 매도
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCloseModal(true)}
                  >
                    매매 종료
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 손익 요약 */}
        <section className="bg-white rounded-xl border p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">평균 진입가</p>
              <p className="text-lg font-semibold">
                {formatCurrency(avgEntryPrice)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                {isOpen ? "보유 수량" : "거래 수량"}
              </p>
              <p className="text-lg font-semibold">
                {isOpen ? `${currentQuantity}주` : `${trade.calculated.totalBuyQuantity}주`}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">
                {isOpen ? "미실현 손익" : "실현 손익"}
              </p>
              <p
                className={`text-lg font-semibold ${
                  displayPnl > 0
                    ? "text-green-600"
                    : displayPnl < 0
                      ? "text-red-600"
                      : ""
                }`}
              >
                {formatCurrency(displayPnl)} ({formatPercent(displayRoi)})
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">R-Multiple</p>
              <p className="text-lg font-semibold">
                {rMultiple != null ? `${rMultiple.toFixed(2)}R` : "-"}
              </p>
            </div>
          </div>

          {isOpen && currentPrice > 0 && (
            <div className="mt-4 pt-4 border-t text-sm text-gray-500">
              현재가: ${currentPrice.toFixed(2)}
            </div>
          )}
        </section>

        {/* 계획 */}
        <section className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">📋 매매 계획</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">전략</p>
              <p className="font-medium">{trade.strategy || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500">손절가</p>
              <p className="font-medium text-red-600">
                {trade.planStopLoss ? `$${trade.planStopLoss}` : "-"}
              </p>
              {trade.planStopLoss && avgEntryPrice > 0 && (
                <p className="text-xs text-red-500">
                  ({(((parseFloat(trade.planStopLoss) - avgEntryPrice) / avgEntryPrice) * 100).toFixed(1)}%)
                </p>
              )}
            </div>
            <div>
              <p className="text-gray-500">계획 진입가</p>
              <p className="font-medium">
                {trade.planEntryPrice ? `$${trade.planEntryPrice}` : "-"}
              </p>
            </div>
          </div>

          {/* n차 목표가 */}
          {(trade.planTargets && trade.planTargets.length > 0) ? (
            <div className="mt-4 pt-4 border-t">
              <p className="text-gray-500 text-sm mb-2">목표가</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {trade.planTargets.map((target, index) => {
                  const percent = avgEntryPrice > 0
                    ? ((target.price - avgEntryPrice) / avgEntryPrice) * 100
                    : null;
                  return (
                    <div
                      key={index}
                      className="p-3 bg-green-50 rounded-lg border border-green-100"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">{index + 1}차</span>
                        <span className="text-xs text-green-600 font-medium">
                          {target.weight}%
                        </span>
                      </div>
                      <p className="font-semibold text-green-700">
                        ${target.price.toFixed(2)}
                      </p>
                      {percent !== null && (
                        <p className="text-xs text-green-600">
                          +{percent.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : trade.planTargetPrice ? (
            <div className="mt-4 pt-4 border-t">
              <p className="text-gray-500 text-sm mb-2">목표가</p>
              <div className="p-3 bg-green-50 rounded-lg border border-green-100 inline-block">
                <p className="font-semibold text-green-700">
                  ${trade.planTargetPrice}
                </p>
                {avgEntryPrice > 0 && (
                  <p className="text-xs text-green-600">
                    +{(((parseFloat(trade.planTargetPrice) - avgEntryPrice) / avgEntryPrice) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {trade.entryReason && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="text-gray-500 mb-1">진입 근거</p>
              <p className="whitespace-pre-wrap">{trade.entryReason}</p>
            </div>
          )}
        </section>

        {/* 매매 내역 타임라인 */}
        <section className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">📊 매매 내역</h2>
          <ActionTimeline
            actions={trade.actions}
            avgEntryPrice={avgEntryPrice}
          />
        </section>

        {/* 복기 (CLOSED인 경우) */}
        {!isOpen && (
          <section className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-4">📝 매매 복기</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">실수 태그:</span>
                {trade.mistakeType ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-sm ${
                      trade.mistakeType === "원칙준수"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {trade.mistakeType}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
              {trade.reviewNote && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                  {trade.reviewNote}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {showActionForm && (
        <ActionForm
          tradeId={trade.id}
          actionType={actionType}
          currentQuantity={currentQuantity}
          avgEntryPrice={avgEntryPrice}
          onClose={() => setShowActionForm(false)}
          onCreated={handleActionCreated}
        />
      )}

      {showCloseModal && (
        <TradeCloseModal
          tradeId={trade.id}
          onClose={() => setShowCloseModal(false)}
          onClosed={handleTradeClosed}
        />
      )}
    </div>
  );
}
