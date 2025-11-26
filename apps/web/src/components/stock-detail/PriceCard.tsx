"use client";

import type { StockPriceInfo, StockMAStatus } from "@/types/stock-detail";
import { formatNumber, formatPrice } from "@/utils/format";
import { MAStatusBadge } from "./MAStatusBadge";
import { TrendingUp } from "lucide-react";

interface PriceCardProps {
  price: StockPriceInfo;
  maStatus: StockMAStatus;
  marketCap: string | null;
}

export function PriceCard({ price, maStatus, marketCap }: PriceCardProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 현재가 */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">현재가</p>
        <p className="mt-1 text-2xl font-bold">{formatPrice(price.lastClose)}</p>
        {price.date && (
          <p className="mt-1 text-xs text-muted-foreground">기준일: {price.date}</p>
        )}
      </div>

      {/* 시가총액 */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">시가총액</p>
        <p className="mt-1 text-2xl font-bold">
          {marketCap ? formatNumber(marketCap) : "-"}
        </p>
      </div>

      {/* RS Score */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">RS Score</p>
        <p className="mt-1 text-2xl font-bold text-blue-600">
          {price.rsScore ?? "-"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">상대강도 (1-99)</p>
      </div>

      {/* 이평선 상태 */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">기술적 상태</p>
        <div className="mt-2">
          {maStatus.ordered || maStatus.goldenCross ? (
            <MAStatusBadge status={maStatus} />
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">해당 없음</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
