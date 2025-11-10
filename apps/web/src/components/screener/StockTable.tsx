"use client";

import React from "react";
import type { ScreenerCompany } from "@/types/golden-cross";
import type { FilterState } from "@/lib/filter-summary";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatRatio, formatPrice } from "@/utils/format";
import { prepareChartData } from "@/utils/chart-data";
import { QuarterlyBarChart } from "@/components/charts/QuarterlyBarChart";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface StockTableProps {
  data: ScreenerCompany[];
  filterState: FilterState;
  tickerSearch?: string;
  tradeDate?: string | null;
  totalCount?: number;
}

/**
 * 필터 상태를 기반으로 테이블 캡션 텍스트 생성
 */
function generateTableCaption(
  filterState: FilterState,
  tickerSearch?: string
): string {
  const parts: string[] = [];

  if (filterState.ordered) {
    if (filterState.justTurned && filterState.lookbackDays) {
      parts.push(
        `최근 ${filterState.lookbackDays}일 이내에 MA20 > MA50 > MA100 > MA200 정배열로 전환한 종목`
      );
    } else {
      parts.push("MA20 > MA50 > MA100 > MA200 정배열 조건을 만족하는 종목");
    }
  } else if (filterState.goldenCross) {
    parts.push("MA50 > MA200 골든크로스 조건을 만족하는 종목");
  } else {
    parts.push("모든 종목");
  }

  if (filterState.goldenCross && filterState.ordered) {
    parts.push(`• 골든크로스 (MA50 > MA200)`);
  }

  if (filterState.profitability === "profitable") {
    parts.push("• 흑자 종목만");
  } else if (filterState.profitability === "unprofitable") {
    parts.push("• 적자 종목만");
  }

  if (filterState.revenueGrowth) {
    if (
      filterState.revenueGrowthRate !== null &&
      filterState.revenueGrowthRate !== undefined
    ) {
      parts.push(
        `• 매출 ${
          filterState.revenueGrowthQuarters ?? 3
        }분기 연속 상승 + 평균 성장률 ${
          filterState.revenueGrowthRate
        }% 이상 종목만`
      );
    } else {
      parts.push(
        `• 매출 ${filterState.revenueGrowthQuarters ?? 3}분기 연속 상승 종목만`
      );
    }
  }

  if (filterState.incomeGrowth) {
    if (
      filterState.incomeGrowthRate !== null &&
      filterState.incomeGrowthRate !== undefined
    ) {
      parts.push(
        `• 수익 ${
          filterState.incomeGrowthQuarters ?? 3
        }분기 연속 상승 + 평균 성장률 ${
          filterState.incomeGrowthRate
        }% 이상 종목만`
      );
    } else {
      parts.push(
        `• 수익 ${filterState.incomeGrowthQuarters ?? 3}분기 연속 상승 종목만`
      );
    }
  }

  if (filterState.pegFilter) {
    parts.push("• PEG < 1");
  }

  if (tickerSearch) {
    parts.push(`• 티커: "${tickerSearch}"`);
  }

  return parts.join(" ");
}

export function StockTable({
  data,
  filterState,
  tickerSearch,
  tradeDate,
  totalCount,
}: StockTableProps) {
  // 포트폴리오는 마운트 시 한 번만 로드하여 포트폴리오 상태 표시
  const { isInPortfolio, togglePortfolio, refresh } = usePortfolio(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  // 마운트 시 한 번만 포트폴리오 로드 (포트폴리오 상태 표시를 위해)
  React.useEffect(() => {
    if (!hasLoaded) {
      refresh().then(() => setHasLoaded(true));
    }
  }, [hasLoaded, refresh]);

  // 포트폴리오 버튼 클릭 핸들러
  const handleTogglePortfolio = async (symbol: string) => {
    await togglePortfolio(symbol);
  };

  if (data.length === 0 && tickerSearch) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-lg font-medium">검색 결과가 없습니다</p>
        <p className="mt-2 text-sm">
          &quot;{tickerSearch}&quot;와 일치하는 종목을 찾을 수 없습니다.
        </p>
      </div>
    );
  }

  return (
    <>
      {data.length > 0 && (
        <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
          <div>
            {tickerSearch ? (
              <>
                검색 결과:{" "}
                <span className="font-semibold text-blue-600">
                  {data.length}
                </span>
                개 / 전체{" "}
                <span className="font-semibold">
                  {totalCount ?? data.length}
                </span>
                개
              </>
            ) : (
              <>
                총{" "}
                <span className="font-semibold text-blue-600">
                  {data.length}
                </span>
                개 종목
              </>
            )}
          </div>
          {tradeDate && (
            <div className="text-gray-500">
              기준일: <span className="font-semibold">{tradeDate}</span>
            </div>
          )}
        </div>
      )}
      <Table>
        <TableCaption>
          {generateTableCaption(filterState, tickerSearch)}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>종목</TableHead>
            <TableHead className="text-right w-[200px]">시가총액</TableHead>
            <TableHead className="text-right w-[140px]">종가</TableHead>
            <TableHead className="text-right w-[100px]">PER</TableHead>
            <TableHead className="text-right w-[100px]">PEG</TableHead>
            <TableHead className="w-[160px] text-right">매출 (8Q)</TableHead>
            <TableHead className="w-[160px] text-right">EPS (8Q)</TableHead>
            <TableHead className="w-[80px] text-center"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((c, idx) => (
            <TableRow key={`${c.symbol}-${idx}`}>
              {/* Symbol */}
              <TableCell className="font-semibold">
                <a
                  href={`https://seekingalpha.com/symbol/${c.symbol}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {c.symbol}
                </a>
              </TableCell>

              {/* Market Cap */}
              <TableCell className="text-right font-medium w-[200px]">
                {c.market_cap ? formatNumber(c.market_cap) : "-"}
              </TableCell>

              {/* Last Close */}
              <TableCell className="text-right w-[140px]">
                {formatPrice(c.last_close)}
              </TableCell>

              {/* PER */}
              <TableCell className="text-right w-[100px]">
                {formatRatio(c.pe_ratio)}
              </TableCell>

              {/* PEG */}
              <TableCell className="text-right w-[100px]">
                {formatRatio(c.peg_ratio)}
              </TableCell>

              {/* 매출 차트 */}
              <TableCell className="w-[160px]">
                <QuarterlyBarChart
                  data={prepareChartData(c.quarterly_financials, "revenue")}
                  type="revenue"
                  height={28}
                  width={160}
                />
              </TableCell>

              {/* EPS 차트 */}
              <TableCell className="w-[160px]">
                <QuarterlyBarChart
                  data={prepareChartData(c.quarterly_financials, "eps")}
                  type="eps"
                  height={28}
                  width={160}
                />
              </TableCell>

              {/* 포트폴리오 버튼 */}
              <TableCell className="w-[80px] text-center">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleTogglePortfolio(c.symbol)}
                  className="cursor-pointer"
                  aria-label={
                    isInPortfolio(c.symbol) ? "포트폴리오에서 제거" : "포트추가"
                  }
                >
                  <Star
                    className={`h-5 w-5 ${
                      isInPortfolio(c.symbol)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-400"
                    }`}
                  />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
