import { notFound } from "next/navigation";
import { getTradeDetail } from "@/lib/trades/queries";
import TradeDetailClient from "./TradeDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TradeDetailPage({ params }: Props) {
  const { id } = await params;
  const tradeId = parseInt(id, 10);

  if (isNaN(tradeId)) {
    notFound();
  }

  const trade = await getTradeDetail(tradeId);

  if (!trade) {
    notFound();
  }

  return <TradeDetailClient trade={trade} />;
}
