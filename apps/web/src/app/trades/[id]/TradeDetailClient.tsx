"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TradeWithDetails } from "@/lib/trades/types";
import { calculateUnrealizedPnl } from "@/lib/trades/calculations";
import { formatPnlFull, formatRoi, formatPrice, formatPercent, formatQuantity, formatRatio } from "@/utils/format";
import ActionTimeline from "@/components/trades/ActionTimeline";
import ActionForm from "@/components/trades/forms/ActionForm";
import TradeCloseModal from "@/components/trades/modals/TradeCloseModal";
import TradeEditModal from "@/components/trades/modals/TradeEditModal";
import { Button } from "@/components/ui/button";

interface TradeDetailClientProps {
  trade: TradeWithDetails;
}

export default function TradeDetailClient({ trade }: TradeDetailClientProps) {
  const router = useRouter();
  const [showActionForm, setShowActionForm] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionType, setActionType] = useState<"BUY" | "SELL">("BUY");

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까? 모든 매매 내역이 삭제됩니다.")) return;

    try {
      const res = await fetch(`/api/trades/${trade.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      router.push("/trades");
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  const handleActionCreated = () => {
    setShowActionForm(false);
    router.refresh();
  };

  const handleTradeClosed = () => {
    setShowCloseModal(false);
    router.refresh();
  };

  const handleTradeUpdated = () => {
    setShowEditModal(false);
    router.refresh();
  };

  const openAddAction = (type: "BUY" | "SELL") => {
    setActionType(type);
    setShowActionForm(true);
  };

  const isOpen = trade.status === "OPEN";
  const {
    avgEntryPrice,
    currentQuantity,
    realizedPnl,
    realizedRoi,
    rMultiple,
  } = trade.calculated;

  const currentPrice = trade.symbolInfo?.currentPrice || 0;
  const { unrealizedPnl, unrealizedRoi } = isOpen
    ? calculateUnrealizedPnl(avgEntryPrice, currentQuantity, currentPrice)
    : { unrealizedPnl: 0, unrealizedRoi: 0 };

  const displayPnl = isOpen ? unrealizedPnl : realizedPnl;
  const displayRoi = isOpen ? unrealizedRoi : realizedRoi;

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
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
              >
                편집
              </Button>
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

      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* 손익 요약 */}
        <section className="bg-white rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">평단가</span>
              <span className="font-semibold">
                {formatPrice(avgEntryPrice)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{isOpen ? "보유" : "거래"}</span>
              <span className="font-semibold">
                {isOpen
                  ? `${formatQuantity(currentQuantity)}주`
                  : `${formatQuantity(trade.calculated.totalBuyQuantity)}주`}
              </span>
            </div>
            {isOpen && currentPrice > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">현재가</span>
                <span className="font-semibold">
                  {formatPrice(currentPrice)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-gray-500">
                {isOpen ? "미실현" : "실현"}
              </span>
              <span
                className={`font-bold ${
                  displayPnl > 0
                    ? "text-green-600"
                    : displayPnl < 0
                      ? "text-red-600"
                      : ""
                }`}
              >
                {formatPnlFull(displayPnl)} ({formatRoi(displayRoi)})
              </span>
            </div>
            {rMultiple != null && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">R</span>
                <span className="font-semibold">{formatRatio(rMultiple)}R</span>
            </div>
            )}
          </div>
        </section>

        {/* 계획 */}
        <section className="bg-white rounded-lg border p-4">
          <h2 className="font-semibold text-sm mb-3">📋 매매 계획</h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">전략</span>
              <span>{trade.strategy || "-"}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">손절</span>
              <span className="text-red-600">
                {trade.planStopLoss ? formatPrice(parseFloat(trade.planStopLoss)) : "-"}
              {trade.planStopLoss && avgEntryPrice > 0 && (
                  <span className="text-xs ml-0.5">
                    ({formatPercent(
                      ((parseFloat(trade.planStopLoss) - avgEntryPrice) / avgEntryPrice) * 100,
                      1
                    )})
                  </span>
              )}
              </span>
            </div>
            {trade.planEntryPrice && (
              <div className="flex items-center gap-1">
                <span className="text-gray-500">계획진입</span>
                <span>{formatPrice(parseFloat(trade.planEntryPrice))}</span>
            </div>
            )}
          </div>

          {/* n차 목표가 */}
          {trade.planTargets && trade.planTargets.length > 0 && (
            <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                {trade.planTargets.map((target, index) => {
                const percent =
                  avgEntryPrice > 0
                    ? ((target.price - avgEntryPrice) / avgEntryPrice) * 100
                    : null;
                  return (
                    <div
                      key={index}
                    className="px-2 py-1 bg-green-50 rounded border border-green-100 text-sm"
                    >
                    <span className="text-gray-500 text-xs">{index + 1}차</span>
                    <span className="font-semibold text-green-700 ml-1">
                      {formatPrice(target.price)}
                    </span>
                    {percent !== null && (
                      <span className="text-xs text-green-600 ml-0.5">
                        (+{formatPercent(percent, 1)})
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-1">
                          {target.weight}%
                        </span>
                    </div>
                  );
                })}
            </div>
          )}

          {!trade.planTargets && trade.planTargetPrice && (
            <div className="mt-3 pt-3 border-t">
              <span className="px-2 py-1 bg-green-50 rounded border border-green-100 text-sm">
                <span className="text-gray-500 text-xs">목표</span>
                <span className="font-semibold text-green-700 ml-1">
                  {formatPrice(parseFloat(trade.planTargetPrice))}
                </span>
                {avgEntryPrice > 0 && (
                  <span className="text-xs text-green-600 ml-0.5">
                    (+{formatPercent(
                      ((parseFloat(trade.planTargetPrice) - avgEntryPrice) / avgEntryPrice) * 100,
                      1
                    )})
                  </span>
                )}
              </span>
            </div>
          )}

          {trade.entryReason && (
            <div className="mt-3 pt-3 border-t text-sm">
              <span className="text-gray-500">진입 근거:</span>
              <span className="ml-2 whitespace-pre-wrap">
                {trade.entryReason}
              </span>
            </div>
          )}
        </section>

        {/* 매매 내역 타임라인 */}
        <section className="bg-white rounded-lg border p-4">
          <h2 className="font-semibold text-sm mb-3">📊 매매 내역</h2>
          <ActionTimeline
            actions={trade.actions}
            avgEntryPrice={avgEntryPrice}
            tradeId={trade.id}
            isClosed={!isOpen}
            onActionUpdated={() => router.refresh()}
          />
        </section>

        {/* 복기 (CLOSED인 경우) */}
        {!isOpen && (
          <section className="bg-white rounded-lg border p-4">
            <h2 className="font-semibold text-sm mb-2">📝 매매 복기</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">실수 태그:</span>
                {trade.mistakeType ? (
                  <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
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
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm whitespace-pre-wrap">
                  {trade.reviewNote}
                </div>
              )}
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

      {showEditModal && (
        <TradeEditModal
          trade={trade}
          onClose={() => setShowEditModal(false)}
          onUpdated={handleTradeUpdated}
        />
      )}
    </div>
  );
}
