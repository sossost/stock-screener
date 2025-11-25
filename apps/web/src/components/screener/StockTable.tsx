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
import { ArrowDown, ArrowUp } from "lucide-react";

interface StockTableProps {
  data: ScreenerCompany[];
  filterState: FilterState;
  tickerSearch?: string;
  tradeDate?: string | null;
  totalCount?: number;
}

type SortKey =
  | "symbol"
  | "market_cap"
  | "last_close"
  | "pe_ratio"
  | "peg_ratio"
  | "rs_score";

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

function SortHeader({
  label,
  active,
  direction,
  tooltip,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  tooltip?: string;
}) {
  const Icon = direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <span className="relative inline-flex items-center gap-1 select-none whitespace-nowrap group">
      {tooltip && (
        <span
          className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden -translate-x-1/2 w-52 whitespace-normal text-left rounded bg-gray-900 px-3 py-2 text-xs text-white shadow group-hover:block"
          role="tooltip"
        >
          {tooltip}
        </span>
      )}
      <span className="inline-flex w-3 justify-center">
        <Icon
          className={`h-3 w-3 transition-opacity ${
            active ? "opacity-100" : "opacity-0"
          }`}
        />
      </span>
      {label}
    </span>
  );
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
  if (filterState.turnAround) {
    parts.push("• 최근 분기 EPS가 양수로 전환된 종목만");
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

  const [sort, setSort] = React.useState<SortState>({
    key: "market_cap",
    direction: "desc",
  });

  const sortedData = React.useMemo(() => {
    const toNum = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return null;
      const num =
        typeof value === "number" ? value : parseFloat(String(value));
      return isNaN(num) || !isFinite(num) ? null : num;
    };

    const arr = [...data];
    arr.sort((a, b) => {
      const dir = sort.direction === "asc" ? 1 : -1;
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sort.key) {
        case "symbol":
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case "market_cap":
          aVal = toNum(a.market_cap);
          bVal = toNum(b.market_cap);
          break;
        case "last_close":
          aVal = toNum(a.last_close);
          bVal = toNum(b.last_close);
          break;
        case "pe_ratio":
          aVal = toNum(a.pe_ratio);
          bVal = toNum(b.pe_ratio);
          break;
        case "peg_ratio":
          aVal = toNum(a.peg_ratio);
          bVal = toNum(b.peg_ratio);
          break;
        case "rs_score":
          aVal = toNum(a.rs_score);
          bVal = toNum(b.rs_score);
          break;
        default:
          break;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * dir;
      }

      const aNum = typeof aVal === "number" ? aVal : null;
      const bNum = typeof bVal === "number" ? bVal : null;

      if (aNum === null && bNum === null) return 0;
      if (aNum === null) return 1;
      if (bNum === null) return -1;
      if (aNum === bNum) return 0;
      return aNum > bNum ? dir : -dir;
    });

    return arr;
  }, [data, sort]);

  const handleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" }
    );
  };

  if (sortedData.length === 0 && tickerSearch) {
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
      {sortedData.length > 0 && (
        <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
          <div>
            {tickerSearch ? (
              <>
                검색 결과:{" "}
                <span className="font-semibold text-blue-600">
                  {sortedData.length}
                </span>
                개 / 전체{" "}
                <span className="font-semibold">
                  {totalCount ?? sortedData.length}
                </span>
                개
              </>
            ) : (
              <>
                총{" "}
                <span className="font-semibold text-blue-600">
                  {sortedData.length}
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
            <TableHead className="w-[48px] text-center">#</TableHead>
            <TableHead
              className="cursor-pointer"
              onClick={() => handleSort("symbol")}
            >
              <SortHeader
                label="종목"
                active={sort.key === "symbol"}
                direction={sort.direction}
                tooltip={"종목 코드로 정렬합니다.\n클릭 시 오름/내림차순이 바뀝니다."}
              />
            </TableHead>
            <TableHead
              className="text-right w-[180px] cursor-pointer"
              onClick={() => handleSort("market_cap")}
            >
              <SortHeader
                label="시가총액"
                active={sort.key === "market_cap"}
                direction={sort.direction}
              />
            </TableHead>
            <TableHead
              className="text-right w-[120px] cursor-pointer"
              onClick={() => handleSort("last_close")}
            >
              <SortHeader
                label="종가"
                active={sort.key === "last_close"}
                direction={sort.direction}
              />
            </TableHead>
            <TableHead
              className="text-right w-[90px] cursor-pointer"
              onClick={() => handleSort("rs_score")}
            >
              <SortHeader
                label="RS"
                active={sort.key === "rs_score"}
                direction={sort.direction}
                tooltip={`상대강도(RS): 최근 12/6/3개월 성과를 가중합(0.4/0.35/0.25)한 점수입니다.\n높을수록 최근까지 상대적으로 강한 흐름입니다.`}
              />
            </TableHead>
            <TableHead
              className="text-right w-[90px] cursor-pointer"
              onClick={() => handleSort("pe_ratio")}
            >
              <SortHeader
                label="PER"
                active={sort.key === "pe_ratio"}
                direction={sort.direction}
                tooltip={
                  "주가수익비율(PER) 기준으로 정렬합니다.\n낮은 PER은 이익 대비 주가가 낮다는 뜻입니다(업종별로 해석이 다를 수 있음)."
                }
              />
            </TableHead>
            <TableHead
              className="text-right w-[90px] cursor-pointer"
              onClick={() => handleSort("peg_ratio")}
            >
              <SortHeader
                label="PEG"
                active={sort.key === "peg_ratio"}
                direction={sort.direction}
                tooltip={
                  "성장 대비 밸류에이션(PEG) 기준으로 정렬합니다.\n1 미만이면 성장률 대비 저평가일 가능성이 있습니다."
                }
              />
            </TableHead>
            <TableHead className="w-[160px] text-right">매출 (8Q)</TableHead>
            <TableHead className="w-[160px] text-right">EPS (8Q)</TableHead>
            <TableHead className="w-[80px] text-center"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((c, idx) => (
            <TableRow key={`${c.symbol}-${idx}`}>
              <TableCell className="text-center text-sm text-muted-foreground">
                {idx + 1}
              </TableCell>
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

              {/* RS */}
              <TableCell className="text-right w-[90px] font-semibold">
                {c.rs_score ?? "-"}
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
