import { Suspense } from "react";
import { TradeStatus } from "@/lib/trades/types";
import { getTradesList, getCashBalance } from "@/lib/trades/queries";
import TradesClient from "./TradesClient";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "매매일지 | Stock Screener",
  description: "매매 기록 및 복기",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
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

async function TradesContent({ status }: { status: TradeStatus }) {
  // 병렬 fetch
  const [trades, cashBalance] = await Promise.all([
    getTradesList(status),
    getCashBalance(),
  ]);

  return (
    <TradesClient
      initialTrades={trades}
      initialStatus={status}
      initialCashBalance={cashBalance}
    />
  );
}

export default async function TradesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = (
    params.status === "CLOSED" ? "CLOSED" : "OPEN"
  ) as TradeStatus;

  return (
    <Suspense fallback={<TradesSkeleton />}>
      <TradesContent status={status} />
    </Suspense>
  );
}
