"use client";

import type { QuarterlyFinancial } from "@/types/stock-detail";

interface QuarterlyChartsProps {
  data: QuarterlyFinancial[];
}

function formatRevenue(value: number | null): string {
  if (value === null) return "-";
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (absValue >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0)}M`;
  }
  return `$${value.toFixed(0)}`;
}

function formatEps(value: number | null): string {
  if (value === null) return "-";
  return `$${value.toFixed(2)}`;
}

function formatQuarterLabel(q: string): string {
  // "Q3 2024" → "2024Q3"
  let match = q.match(/Q(\d)\s+(\d{4})/);
  if (match) {
    return `${match[2]}Q${match[1]}`;
  }
  // "2024Q3" → 그대로
  match = q.match(/(\d{4})Q(\d)/);
  if (match) {
    return q;
  }
  return q;
}

const BAR_HEIGHT = 120;

// ========== 매출 차트 ==========
function RevenueChart({ data }: { data: QuarterlyFinancial[] }) {
  const values = data.map((d) => d.revenue ?? 0);
  const maxVal = Math.max(...values);

  return (
    <div className="rounded-lg bg-gray-50 p-4 flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">매출</h3>

      {/* 차트 영역 - 남은 공간 꽉 채움 */}
      <div className="flex-1 flex items-end">
        {data.map((item, index) => {
          const value = item.revenue ?? 0;
          const pct = maxVal === 0 ? 100 : (value / maxVal) * 100;

          return (
            <div key={index} className="flex-1 flex justify-center items-end h-full group relative">
              <div
                className="w-1/2 max-w-[24px] bg-green-500 rounded-t hover:bg-green-600 transition-colors relative"
                style={{ height: `${pct}%` }}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-green-100 text-green-700">
                  {formatRevenue(item.revenue)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 레이블 영역 - 아래 고정 */}
      <div className="flex gap-2 mt-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 text-center">
            <div className="text-[10px] text-gray-500">
              {formatQuarterLabel(item.quarter)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== EPS 차트 ==========
function EpsChart({ data }: { data: QuarterlyFinancial[] }) {
  const values = data.map((d) => d.eps ?? 0);
  const maxPositive = Math.max(...values, 0);
  const minNegative = Math.min(...values, 0);
  const maxAbsolute = Math.max(maxPositive, Math.abs(minNegative));
  const hasNegative = minNegative < 0;

  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">EPS</h3>

      <div
        className="flex"
        style={{ height: hasNegative ? `${BAR_HEIGHT * 2 + 1}px` : `${BAR_HEIGHT}px` }}
      >
        {data.map((item, index) => {
          const value = item.eps;
          const isPositive = value !== null && value >= 0;
          const barHeight =
            value === null || maxAbsolute === 0
              ? 2
              : Math.max((Math.abs(value) / maxAbsolute) * BAR_HEIGHT, 2);

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center group relative"
            >
              <div
                className={`absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap
                  opacity-0 group-hover:opacity-100 transition-opacity z-10
                  ${isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
              >
                {formatEps(value)}
              </div>

              {hasNegative ? (
                <>
                  <div
                    className="flex flex-col justify-end items-center w-full"
                    style={{ height: `${BAR_HEIGHT}px` }}
                  >
                    {isPositive && value !== null && (
                      <div
                        className="w-1/2 max-w-[24px] rounded-t-sm bg-green-500 transition-all duration-300 group-hover:bg-green-600"
                        style={{ height: `${barHeight}px` }}
                      />
                    )}
                  </div>
                  <div className="w-full h-px bg-gray-300" />
                  <div
                    className="flex flex-col justify-start items-center w-full"
                    style={{ height: `${BAR_HEIGHT}px` }}
                  >
                    {!isPositive && value !== null && (
                      <div
                        className="w-1/2 max-w-[24px] rounded-b-sm bg-red-500 transition-all duration-300 group-hover:bg-red-600"
                        style={{ height: `${barHeight}px` }}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-end justify-center w-full">
                  <div
                    className="w-1/2 max-w-[24px] rounded-t-sm bg-green-500 transition-all duration-300 group-hover:bg-green-600"
                    style={{ height: `${barHeight}px` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex mt-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 text-center">
            <div className="text-[10px] text-gray-500">
              {formatQuarterLabel(item.quarter)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== 메인 ==========
export function QuarterlyCharts({ data }: QuarterlyChartsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">분기별 실적</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          분기별 실적 데이터가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">분기별 실적</h2>

      <div className="grid grid-cols-2 gap-4">
        <RevenueChart data={data} />
        <EpsChart data={data} />
      </div>
    </div>
  );
}
