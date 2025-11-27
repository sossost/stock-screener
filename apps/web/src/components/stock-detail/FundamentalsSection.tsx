"use client";

import type { StockRatios } from "@/types/stock-detail";

interface FundamentalsSectionProps {
  ratios: StockRatios | null;
  isEtf: boolean;
}

function formatRatioValue(value: string | null): string {
  if (value === null) return "-";
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return "-";
  return num.toFixed(2);
}

function formatPercent(value: string | null): string {
  if (value === null) return "-";
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return "-";
  return `${(num * 100).toFixed(1)}%`;
}

function MetricRow({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground" title={tooltip}>
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

// 밸류에이션 카드 (세로 배치)
export function ValuationCard({ ratios }: { ratios: StockRatios | null }) {
  if (!ratios) return null;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">밸류에이션</h3>
        {ratios.valuationDate && (
          <span className="text-xs text-muted-foreground">
            {ratios.valuationDate}
          </span>
        )}
      </div>
      <div className="divide-y">
        <MetricRow
          label="P/E"
          value={formatRatioValue(ratios.valuation.peRatio)}
          tooltip="주가 / 주당순이익"
        />
        <MetricRow
          label="PEG"
          value={formatRatioValue(ratios.valuation.pegRatio)}
          tooltip="P/E / EPS 성장률"
        />
        <MetricRow
          label="P/S"
          value={formatRatioValue(ratios.valuation.psRatio)}
          tooltip="시가총액 / 연간매출"
        />
        <MetricRow
          label="P/B"
          value={formatRatioValue(ratios.valuation.pbRatio)}
          tooltip="시가총액 / 자기자본"
        />
        <MetricRow
          label="EV/EBITDA"
          value={formatRatioValue(ratios.valuation.evEbitda)}
          tooltip="기업가치 / EBITDA"
        />
      </div>
    </div>
  );
}

// 분기 재무 섹션
export function QuarterlyFinancialsCard({
  ratios,
}: {
  ratios: StockRatios | null;
}) {
  if (!ratios) return null;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm h-full">
      <div className="mb-3">
        <h3 className="font-semibold">분기 재무</h3>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {/* 수익성 */}
        <div>
          <h4 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            수익성
          </h4>
          <div className="divide-y">
            <MetricRow
              label="매출총이익률"
              value={formatPercent(ratios.profitability.grossMargin)}
            />
            <MetricRow
              label="영업이익률"
              value={formatPercent(ratios.profitability.opMargin)}
            />
            <MetricRow
              label="순이익률"
              value={formatPercent(ratios.profitability.netMargin)}
            />
          </div>
        </div>

        {/* 재무 건전성 */}
        <div>
          <h4 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            재무 건전성
          </h4>
          <div className="divide-y">
            <MetricRow
              label="부채비율 (D/E)"
              value={formatRatioValue(ratios.leverage.debtEquity)}
            />
            <MetricRow
              label="부채/자산"
              value={formatPercent(ratios.leverage.debtAssets)}
            />
            <MetricRow
              label="이자보상배율"
              value={formatRatioValue(ratios.leverage.intCoverage)}
              tooltip="영업이익 / 이자비용"
            />
          </div>
        </div>

        {/* 배당 */}
        <div>
          <h4 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            배당
          </h4>
          <div className="divide-y">
            <MetricRow
              label="배당수익률"
              value={formatPercent(ratios.dividend.divYield)}
            />
            <MetricRow
              label="배당성향"
              value={formatPercent(ratios.dividend.payoutRatio)}
              tooltip="배당금 / 순이익"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 기존 FundamentalsSection (하위 호환)
export function FundamentalsSection({
  ratios,
  isEtf,
}: FundamentalsSectionProps) {
  if (!ratios) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">펀더멘탈</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          재무 데이터가 없습니다.
        </p>
      </div>
    );
  }

  if (isEtf) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">펀더멘탈</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          ETF/펀드는 개별 재무 지표가 제공되지 않습니다.
        </p>
      </div>
    );
  }

  return <QuarterlyFinancialsCard ratios={ratios} />;
}
