"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TradeListItem, TradeStatus } from "@/lib/trades/types";
import TradeCard from "@/components/trades/TradeCard";
import TradeForm from "@/components/trades/TradeForm";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

// 스켈레톤 카드 컴포넌트
function TradeCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-16 bg-gray-200 rounded" />
            <div className="h-5 w-12 bg-gray-100 rounded-full" />
          </div>
          <div className="h-4 w-32 bg-gray-100 rounded mt-1" />
        </div>
        <div className="text-right">
          <div className="h-6 w-16 bg-gray-200 rounded" />
          <div className="h-4 w-12 bg-gray-100 rounded mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-3 w-10 bg-gray-100 rounded mb-1" />
            <div className="h-5 w-14 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t flex items-center justify-between">
        <div className="h-3 w-20 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

function TradeListSkeleton() {
  return (
    <div className="space-y-6">
      <section>
        <div className="h-7 w-28 bg-gray-200 rounded mb-3 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <TradeCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

type StatusFilter = TradeStatus | "ALL";

export default function TradesClient() {
  const [trades, setTrades] = useState<TradeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [showNewTradeForm, setShowNewTradeForm] = useState(false);

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      const res = await fetch(`/api/trades?${params.toString()}`);
      if (!res.ok) throw new Error("매매 목록 조회 실패");
      const data = await res.json();
      setTrades(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const handleTradeCreated = () => {
    setShowNewTradeForm(false);
    fetchTrades();
  };

  const openTrades = trades.filter((t) => t.status === "OPEN");
  const closedTrades = trades.filter((t) => t.status === "CLOSED");

  const filterTabs = [
    { value: "ALL" as const, label: "전체" },
    { value: "OPEN" as const, label: "진행중", count: openTrades.length },
    { value: "CLOSED" as const, label: "완료", count: closedTrades.length },
  ];

  const getEmptyMessage = () => {
    if (statusFilter === "OPEN") return "진행 중인 매매가 없습니다";
    if (statusFilter === "CLOSED") return "완료된 매매가 없습니다";
    return "매매 기록이 없습니다";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="매매일지"
        backHref="/"
        backLabel="← 스크리너"
        actions={
          <>
            <Link
              href="/trades/stats"
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              📊 통계
            </Link>
            <Button onClick={() => setShowNewTradeForm(true)}>+ 새 매매</Button>
          </>
        }
      />

      {/* 필터 */}
      <div className="container mx-auto px-4 py-4">
        <FilterTabs
          tabs={filterTabs}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {/* 컨텐츠 */}
      <main className="container mx-auto px-4 pb-8">
        {loading ? (
          <TradeListSkeleton />
        ) : error ? (
          <ErrorState message={error} retry={fetchTrades} />
        ) : trades.length === 0 ? (
          <EmptyState
            title={getEmptyMessage()}
            action={{
              label: "새 매매 시작하기",
              onClick: () => setShowNewTradeForm(true),
            }}
          />
        ) : (
          <div className="space-y-6">
            {statusFilter !== "CLOSED" && openTrades.length > 0 && (
              <section>
                {statusFilter === "ALL" && (
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    진행중 ({openTrades.length})
                  </h2>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {openTrades.map((trade) => (
                    <TradeCard key={trade.id} trade={trade} />
                  ))}
                </div>
              </section>
            )}

            {statusFilter !== "OPEN" && closedTrades.length > 0 && (
              <section>
                {statusFilter === "ALL" && (
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    완료 ({closedTrades.length})
                  </h2>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {closedTrades.map((trade) => (
                    <TradeCard key={trade.id} trade={trade} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {showNewTradeForm && (
        <TradeForm
          onClose={() => setShowNewTradeForm(false)}
          onCreated={handleTradeCreated}
        />
      )}
    </div>
  );
}
