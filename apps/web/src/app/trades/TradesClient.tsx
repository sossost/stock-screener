"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TradeListItem, TradeStatus } from "@/lib/trades/types";
import OpenTradesTable from "@/components/trades/OpenTradesTable";
import ClosedTradesTable from "@/components/trades/ClosedTradesTable";
import PortfolioSummary from "@/components/trades/PortfolioSummary";
import TradeForm from "@/components/trades/TradeForm";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { EmptyState } from "@/components/ui/empty-state";

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
}

export default function TradesClient({
  initialTrades,
  initialStatus,
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
