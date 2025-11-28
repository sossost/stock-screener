"use client";

import type { StockDetail } from "@/types/stock-detail";
import {
  StockHeader,
  PriceCard,
  ValuationCard,
  QuarterlyFinancialsCard,
  QuarterlyCharts,
} from "@/components/stock-detail";

interface StockDetailClientProps {
  data: StockDetail;
}

export function StockDetailClient({ data }: StockDetailClientProps) {
  const isEtf = data.basic.isEtf || data.basic.isFund;

  return (
    <div className="space-y-4">
      {/* 헤더: 정성적 정보 */}
      <StockHeader basic={data.basic} />

      {/* 기술적 지표 */}
      <PriceCard
        price={data.price}
        maStatus={data.maStatus}
        marketCap={data.basic.marketCap}
      />

      {/* 펀더멘탈: 밸류에이션(1열) + 분기재무(3열) */}
      {!isEtf && data.ratios && (
        <div className="grid gap-4 lg:grid-cols-4">
          <ValuationCard ratios={data.ratios} />
          <div className="lg:col-span-3">
            <QuarterlyFinancialsCard ratios={data.ratios} />
          </div>
        </div>
      )}

      {/* 분기별 실적 차트 */}
      {!isEtf && <QuarterlyCharts data={data.quarterlyFinancials} />}

      {/* ETF/펀드 메시지 */}
      {isEtf && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="font-semibold">펀더멘탈</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ETF/펀드는 개별 재무 지표가 제공되지 않습니다.
          </p>
        </div>
      )}
    </div>
  );
}
