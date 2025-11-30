"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TradeListItem, TradeStatus } from "@/lib/trades/types";
import OpenTradesTable from "@/components/trades/tables/OpenTradesTable";
import ClosedTradesTable from "@/components/trades/tables/ClosedTradesTable";
import PortfolioSummary from "@/components/trades/PortfolioSummary";
import TradeForm from "@/components/trades/forms/TradeForm";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { exportTradesToCsv } from "@/utils/export";

const FILTER_TABS = [
  { value: "OPEN" as const, label: "진행중" },
  { value: "CLOSED" as const, label: "완료" },
];

const EMPTY_MESSAGES: Record<TradeStatus, string> = {
  OPEN: "진행 중인 매매가 없습니다",
  CLOSED: "완료된 매매가 없습니다",
};

interface TradesClientProps {
  initialTrades: TradeListItem[];
  initialStatus: TradeStatus;
  initialCashBalance: number;
}

export default function TradesClient({
  initialTrades,
  initialStatus,
  initialCashBalance,
}: TradesClientProps) {
  const router = useRouter();
  const [showNewTradeForm, setShowNewTradeForm] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);

  const handleStatusChange = (status: TradeStatus) => {
    router.push(`/trades?status=${status}`);
  };

  const handleTradeCreated = () => {
    setShowNewTradeForm(false);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="매매일지"
        backHref="/"
        backLabel="← 스크리너"
        actions={
          <>
            {initialTrades.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportTradesToCsv(initialTrades, initialStatus)}
                title="CSV 내보내기"
              >
                📥 내보내기
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/trades/stats">📊 통계</Link>
            </Button>
            <Button onClick={() => setShowNewTradeForm(true)}>+ 새 매매</Button>
          </>
        }
      />

      <div className="container mx-auto px-4 py-3">
        <FilterTabs
          tabs={FILTER_TABS}
          value={initialStatus}
          onChange={handleStatusChange}
        />
      </div>

      <main className="container mx-auto px-4 pb-6">
        {initialTrades.length === 0 ? (
          <EmptyState
            title={EMPTY_MESSAGES[initialStatus]}
            action={{
              label: "새 매매 시작하기",
              onClick: () => setShowNewTradeForm(true),
            }}
          />
        ) : (
          <div className="space-y-3">
            {initialStatus === "OPEN" && (
              <>
                <PortfolioSummary
                  trades={initialTrades}
                  onTotalAssetsChange={setTotalAssets}
                  initialCashBalance={initialCashBalance}
                />
                <OpenTradesTable
                  trades={initialTrades}
                  totalAssets={totalAssets}
                />
              </>
            )}

            {initialStatus === "CLOSED" && (
              <ClosedTradesTable trades={initialTrades} />
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
