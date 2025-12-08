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
import { formatPnl } from "@/utils/format";

type ProfitFilter = "profit" | "loss" | "all";

const FILTER_TABS = [
  { value: "OPEN" as const, label: "진행중" },
  { value: "CLOSED" as const, label: "완료" },
];

const PROFIT_FILTER_TABS: { value: ProfitFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "profit", label: "수익" },
  { value: "loss", label: "손실" },
];

const EMPTY_MESSAGES: Record<TradeStatus, string> = {
  OPEN: "진행 중인 매매가 없습니다",
  CLOSED: "완료된 매매가 없습니다",
};

interface TradesClientProps {
  initialTrades: TradeListItem[];
  initialStatus: TradeStatus;
  initialCounts: { open: number; closed: number };
  initialFilter?: ProfitFilter;
}

export default function TradesClient({
  initialTrades,
  initialStatus,
  initialCounts,
  initialFilter = "all",
}: TradesClientProps) {
  const router = useRouter();
  const [showNewTradeForm, setShowNewTradeForm] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);
  const [profitFilter, setProfitFilter] = useState<ProfitFilter>(initialFilter);

  // 완료된 거래의 수익/손실 개수 및 총합 계산
  const closedTrades = initialStatus === "CLOSED" ? initialTrades : [];
  const profitTrades = closedTrades.filter(
    (trade) => trade.calculated.realizedPnl > 0
  );
  const lossTrades = closedTrades.filter(
    (trade) => trade.calculated.realizedPnl < 0
  );

  // 필터에 따른 총합 계산
  const getTotalPnl = () => {
    if (initialStatus !== "CLOSED") return 0;
    if (profitFilter === "profit") {
      return profitTrades.reduce(
        (sum, trade) => sum + trade.calculated.realizedPnl,
        0
      );
    }
    if (profitFilter === "loss") {
      return lossTrades.reduce(
        (sum, trade) => sum + trade.calculated.realizedPnl,
        0
      );
    }
    // "all"일 때는 전체 총합
    return closedTrades.reduce(
      (sum, trade) => sum + trade.calculated.realizedPnl,
      0
    );
  };

  const totalPnl = getTotalPnl();

  // 수익 총합과 손실 총합
  const totalProfit = profitTrades.reduce(
    (sum, trade) => sum + trade.calculated.realizedPnl,
    0
  );
  const totalLoss = lossTrades.reduce(
    (sum, trade) => sum + trade.calculated.realizedPnl,
    0
  );

  const handleStatusChange = (status: TradeStatus) => {
    // 상태 변경 시 필터 초기화
    router.push(`/trades?status=${status}`);
  };

  const handleProfitFilterChange = (filter: ProfitFilter) => {
    setProfitFilter(filter);
    const params = new URLSearchParams(window.location.search);
    params.set("status", initialStatus);
    if (filter !== "all") {
      params.set("filter", filter);
    } else {
      params.delete("filter");
    }
    router.push(`/trades?${params.toString()}`);
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

      <div className="container mx-auto px-4 py-3 space-y-3">
        <FilterTabs
          tabs={[
            { ...FILTER_TABS[0], count: initialCounts.open },
            { ...FILTER_TABS[1], count: initialCounts.closed },
          ]}
          value={initialStatus}
          onChange={handleStatusChange}
        />
        {initialStatus === "CLOSED" && (
          <div className="flex items-center justify-between">
            <FilterTabs
              tabs={[
                { ...PROFIT_FILTER_TABS[0], count: closedTrades.length },
                { ...PROFIT_FILTER_TABS[1], count: profitTrades.length },
                { ...PROFIT_FILTER_TABS[2], count: lossTrades.length },
              ]}
              value={profitFilter}
              onChange={handleProfitFilterChange}
            />
            {closedTrades.length > 0 && (
              <div className="text-sm">
                {profitFilter === "all" && (
                  <span
                    className={`font-semibold ${
                      totalPnl >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    총합: {formatPnl(totalPnl)}
                  </span>
                )}
                {profitFilter === "profit" && (
                  <span className="text-green-600 font-semibold">
                    수익 총합: {formatPnl(totalProfit)}
                  </span>
                )}
                {profitFilter === "loss" && (
                  <span className="text-red-600 font-semibold">
                    손실 총합: {formatPnl(totalLoss)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
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
              <ClosedTradesTable trades={initialTrades} filter={profitFilter} />
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
