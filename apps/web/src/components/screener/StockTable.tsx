"use client";

import React from "react";
import type { ScreenerCompany } from "@/types/golden-cross";
import type { FilterState } from "@/lib/filters/summary";
import {
  screenerColumns,
  defaultSort,
  type SortKey,
} from "@/components/screener/columns";
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
import { formatSector } from "@/utils/sector";
import Link from "next/link";

interface StockTableProps {
  data: ScreenerCompany[];
  filterState: FilterState;
  tickerSearch?: string;
  tradeDate?: string | null;
  totalCount?: number;
  /** 포트폴리오 토글 후 부모에게 알리는 콜백 (상태 동기화용) */
  onSymbolToggle?: (symbol: string) => void;
}

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
  onSymbolToggle,
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
    const success = await togglePortfolio(symbol);
    if (success && onSymbolToggle) {
      onSymbolToggle(symbol);
    }
  };

  const [sort, setSort] = React.useState<SortState>({
    key: defaultSort.key,
    direction: defaultSort.direction,
  });

  const sortedData = React.useMemo(() => {
    const toNum = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return null;
      const num = typeof value === "number" ? value : parseFloat(String(value));
      return isNaN(num) || !isFinite(num) ? null : num;
    };
    const normalizeString = (value: string | null | undefined) => {
      if (value === null || value === undefined) return null;
      const trimmed = String(value).trim();
      return trimmed === "" ? null : trimmed;
    };
    const toSectorKey = (value: string | null | undefined) => {
      const { display } = formatSector(value);
      return display === "-" ? null : display;
    };

    const arr = [...data];
    arr.sort((a, b) => {
      const dir = sort.direction === "asc" ? 1 : -1;
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sort.key) {
        case "symbol":
          aVal = normalizeString(a.symbol);
          bVal = normalizeString(b.symbol);
          break;
        case "sector":
          aVal = toSectorKey(a.sector);
          bVal = toSectorKey(b.sector);
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

      const aStr = typeof aVal === "string" ? aVal : null;
      const bStr = typeof bVal === "string" ? bVal : null;

      if (aStr !== null || bStr !== null) {
        if (aStr === null) return 1;
        if (bStr === null) return -1;
        return (
          aStr.localeCompare(bStr, undefined, { sensitivity: "base" }) * dir
        );
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
            {screenerColumns.map((col) => {
              const sortable = col.sortable && col.sortKey;
              const className = [
                col.width ?? "",
                col.align === "right"
                  ? "text-right"
                  : col.align === "center"
                  ? "text-center"
                  : "",
                sortable ? "cursor-pointer select-none" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <TableHead
                  key={col.key}
                  className={className}
                  onClick={
                    sortable ? () => handleSort(col.sortKey!) : undefined
                  }
                >
                  {sortable ? (
                    <SortHeader
                      label={col.label}
                      active={sort.key === col.sortKey}
                      direction={sort.direction}
                      tooltip={col.tooltip}
                    />
                  ) : (
                    col.label
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((c, idx) => (
            <TableRow key={`${c.symbol}-${idx}`}>
              {screenerColumns.map((col) => {
                const alignClass =
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "";
                const widthClass = col.width ?? "";

                switch (col.key) {
                  case "index":
                    return (
                      <TableCell
                        key={col.key}
                        className={`${alignClass} ${widthClass} text-sm text-muted-foreground`}
                      >
                        {idx + 1}
                      </TableCell>
                    );
                  case "symbol":
                    return (
                      <TableCell
                        key={col.key}
                        className={`${alignClass} ${widthClass} font-semibold`}
                      >
                        <Link
                          href={`/stock/${c.symbol}`}
                          className="text-blue-600 hover:underline"
                        >
                          {c.symbol}
                        </Link>
                      </TableCell>
                    );
                  case "market_cap":
                    return (
                      <TableCell
                        key={col.key}
                        className={`${alignClass} ${widthClass} font-medium`}
                      >
                        {c.market_cap ? formatNumber(c.market_cap) : "-"}
                      </TableCell>
                    );
                  case "last_close":
                    return (
                      <TableCell
                        key={col.key}
                        className={`${alignClass} ${widthClass}`}
                      >
                        {formatPrice(c.last_close)}
                      </TableCell>
                    );
                  case "sector":
                    return (
                      <TableCell
                        key={col.key}
                        className={`${alignClass} ${widthClass}`}
                        title={
                          c.sector &&
                          formatSector(c.sector).display !== c.sector
                            ? c.sector
                            : undefined
                        }
                      >
                        <span className="block w-full truncate text-right">
                          {formatSector(c.sector).display}
                        </span>
                      </TableCell>
                    );
                  case "rs_score":
                    return (
                      <TableCell
                        key={col.key}
                        className={`${alignClass} ${widthClass} font-semibold`}
                      >
                        {c.rs_score ?? "-"}
                      </TableCell>
                    );
                  case "pe_ratio":
                    return (
                      <TableCell
                        key={col.key}
                        className={`${alignClass} ${widthClass}`}
                      >
                        {formatRatio(c.pe_ratio)}
                      </TableCell>
                    );
                  case "peg_ratio":
                    return (
                      <TableCell
                        key={col.key}
                        className={`${alignClass} ${widthClass}`}
                      >
                        {formatRatio(c.peg_ratio)}
                      </TableCell>
                    );
                  case "revenue":
                    return (
                      <TableCell
                        key={col.key}
                        className={`${alignClass} ${widthClass}`}
                      >
                        <QuarterlyBarChart
                          data={prepareChartData(
                            c.quarterly_financials,
                            "revenue"
                          )}
                          type="revenue"
                          height={28}
                          width={160}
                        />
                      </TableCell>
                    );
                  case "eps":
                    return (
                      <TableCell
                        key={col.key}
                        className={`${alignClass} ${widthClass}`}
                      >
                        <QuarterlyBarChart
                          data={prepareChartData(c.quarterly_financials, "eps")}
                          type="eps"
                          height={28}
                          width={160}
                        />
                      </TableCell>
                    );
                  case "actions":
                    return (
                      <TableCell
                        key={col.key}
                        className={`${alignClass} ${widthClass}`}
                      >
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleTogglePortfolio(c.symbol)}
                          className="cursor-pointer"
                          aria-label={
                            isInPortfolio(c.symbol)
                              ? "포트폴리오에서 제거"
                              : "포트추가"
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
                    );
                  default:
                    return null;
                }
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
