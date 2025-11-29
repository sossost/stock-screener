"use client";

import type { StockDetail } from "@/types/stock-detail";
import {
  StockHeader,
  QuarterlyFinancialsCard,
  QuarterlyCharts,
} from "@/components/stock-detail";
import { TechnicalChart } from "@/components/stock-detail/TechnicalChart";

interface StockDetailClientProps {
  data: StockDetail;
}

export function StockDetailClient({ data }: StockDetailClientProps) {
  const isEtf = data.basic.isEtf || data.basic.isFund;

  return (
    <div className="space-y-4">
      {/* 헤더: 네비게이션 + 기업/가격/밸류에이션 정보 */}
      <StockHeader
        basic={data.basic}
        price={data.price}
        maStatus={data.maStatus}
        ratios={data.ratios}
      />

      {/* 주가 차트 */}
      <TechnicalChart symbol={data.basic.symbol} />

      {/* 분기 재무 (수익성/레버리지/배당) */}
      {!isEtf && data.ratios && (
            <QuarterlyFinancialsCard ratios={data.ratios} />
      )}

      {/* 분기별 실적 차트 */}
      {!isEtf && <QuarterlyCharts data={data.quarterlyFinancials} />}

      {/* ETF/펀드 메시지 */}
      {isEtf && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            ETF/펀드는 개별 재무 지표가 제공되지 않습니다.
          </p>
        </div>
      )}
    </div>
  );
}
