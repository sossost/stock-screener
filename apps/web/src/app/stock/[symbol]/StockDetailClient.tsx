"use client";

import type { StockDetail } from "@/types/stock-detail";
import { StockHeader, PriceCard } from "@/components/stock-detail";

interface StockDetailClientProps {
  data: StockDetail;
}

export function StockDetailClient({ data }: StockDetailClientProps) {
  return (
    <div className="space-y-6">
      <StockHeader basic={data.basic} />
      <PriceCard
        price={data.price}
        maStatus={data.maStatus}
        marketCap={data.basic.marketCap}
      />
    </div>
  );
}

