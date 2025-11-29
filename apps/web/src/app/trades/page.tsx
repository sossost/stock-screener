import { TradeStatus } from "@/lib/trades/types";
import { getTradesList } from "@/lib/trades/queries";
import TradesClient from "./TradesClient";

export const metadata = {
  title: "매매일지 | Stock Screener",
  description: "매매 기록 및 복기",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function TradesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = (params.status === "CLOSED" ? "CLOSED" : "OPEN") as TradeStatus;
  const trades = await getTradesList(status);

  return <TradesClient initialTrades={trades} initialStatus={status} />;
}
