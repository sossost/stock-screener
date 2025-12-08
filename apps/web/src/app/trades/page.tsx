import { Suspense } from "react";
import { TradeStatus } from "@/lib/trades/types";
import { getTradesList, getTradesCount } from "@/lib/trades/queries";
import TradesClient from "./TradesClient";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "매매일지 | Stock Screener",
  description: "매매 기록 및 복기",
};

interface PageProps {
  searchParams: Promise<{ status?: string; filter?: string }>;
}

function TradesSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-3">
        <Skeleton className="h-10 w-32 mb-4" />
        <Skeleton className="h-10 w-full mb-6" />
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

async function TradesContent({
  status,
  filter,
}: {
  status: TradeStatus;
  filter?: "profit" | "loss" | "all";
}) {
  // 병렬 fetch
  const [trades, counts] = await Promise.all([
    getTradesList(status),
    getTradesCount(),
  ]);

  return (
    <TradesClient
      initialTrades={trades}
      initialStatus={status}
      initialCounts={counts}
      initialFilter={filter}
    />
  );
}

export default async function TradesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = (
    params.status === "CLOSED" ? "CLOSED" : "OPEN"
  ) as TradeStatus;
  // URL 파라미터 filter 값 검증 (입력 검증)
  const filter =
    params.filter === "profit" || params.filter === "loss"
      ? params.filter
      : "all";

  return (
    <Suspense fallback={<TradesSkeleton />}>
      <TradesContent status={status} filter={filter} />
    </Suspense>
  );
}
