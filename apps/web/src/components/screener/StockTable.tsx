"use client";

import React from "react";
import type { ScreenerCompany } from "@/types/screener";
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
import { useWatchlist } from "@/hooks/useWatchlist";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatSector } from "@/utils/sector";
import Link from "next/link";
import { INFINITE_SCROLL } from "@/lib/filters/constants";
import { useSortState } from "@/hooks/useSortState";

interface StockTableProps {
  data: ScreenerCompany[];
  filterState: FilterState;
  tickerSearch?: string;
  tradeDate?: string | null;
  totalCount?: number;
  /** 관심종목 토글 후 부모에게 알리는 콜백 (상태 동기화용) */
  onSymbolToggle?: (symbol: string) => void;
}

// SortState는 utils/sort-storage.ts에서 import하므로 여기서는 제거

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
        `최근 ${filterState.lookbackDays}일 이내에 MA20 > MA50 > MA200 정배열로 전환한 종목`
      );
    } else {
      parts.push("MA20 > MA50 > MA200 정배열 조건을 만족하는 종목");
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
  // 관심종목은 마운트 시 한 번만 로드하여 상태 표시
  // 관심종목 자동 로드 (초기 로드 시 상태 표시를 위해)
  const {
    isInWatchlist,
    toggleWatchlist,
    isLoading: isWatchlistLoading,
  } = useWatchlist(true);

  // 관심종목 버튼 클릭 핸들러 (메모이제이션)
  const handleToggleWatchlist = React.useCallback(
    async (symbol: string) => {
      const success = await toggleWatchlist(symbol);
      if (success && onSymbolToggle) {
        onSymbolToggle(symbol);
      }
    },
    [toggleWatchlist, onSymbolToggle]
  );

  // 정렬 상태를 URL로 관리
  const { sort, setSort } = useSortState();

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

  // 관심종목 상태 맵 생성 (5000번 호출 방지) - sortedData 이후에 선언
  // 관심종목 맵 생성 (로딩 중이면 빈 맵 반환하여 별표 표시 안 함)
  const watchlistMap = React.useMemo(() => {
    const map = new Map<string, boolean>();
    // 관심종목 로딩 중이면 빈 맵 반환 (별표 표시 안 함)
    if (isWatchlistLoading) {
      return map;
    }
    sortedData.forEach((c) => {
      map.set(c.symbol, isInWatchlist(c.symbol));
    });
    return map;
  }, [sortedData, isInWatchlist, isWatchlistLoading]);

  // 무한 스크롤을 위한 상태
  const [visibleCount, setVisibleCount] = React.useState<number>(
    INFINITE_SCROLL.INITIAL_LOAD_COUNT
  );
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useRef<HTMLTableRowElement>(null);
  const sortedDataLengthRef = React.useRef(sortedData.length);

  // sortedData.length를 ref로 추적하여 observer 콜백에서 최신 값 참조
  React.useEffect(() => {
    sortedDataLengthRef.current = sortedData.length;
  }, [sortedData.length]);

  // Intersection Observer로 무한 스크롤 구현
  React.useEffect(() => {
    const loadMoreEl = loadMoreRef.current;
    if (!loadMoreEl) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => {
            const maxLength = sortedDataLengthRef.current;
            return prev < maxLength
              ? Math.min(prev + INFINITE_SCROLL.LOAD_MORE_COUNT, maxLength)
              : prev;
          });
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreEl);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [sortedData.length]); // 데이터 길이 변경 시 observer 재연결

  // 데이터가 변경되면 visibleCount 리셋
  React.useEffect(() => {
    setVisibleCount(INFINITE_SCROLL.INITIAL_LOAD_COUNT);
  }, [data]); // data.length 대신 data 전체로 변경 감지

  const handleSort = React.useCallback(
    async (key: SortKey) => {
      const newSort: { key: SortKey; direction: "asc" | "desc" } =
        sort.key === key
          ? {
              key,
              direction: sort.direction === "asc" ? "desc" : "asc",
            }
          : { key, direction: "desc" };
      await setSort(newSort);
    },
    [sort, setSort]
  );

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
          {sortedData.slice(0, visibleCount).map((c, idx) => (
            <StockTableRow
              key={`${c.symbol}-${idx}`}
              company={c}
              index={idx}
              isInWatchlist={watchlistMap.get(c.symbol) ?? false}
              onToggleWatchlist={handleToggleWatchlist}
            />
          ))}
          {visibleCount < sortedData.length && (
            <TableRow ref={loadMoreRef}>
              <TableCell
                colSpan={screenerColumns.length}
                className="text-center py-4"
              >
                <div className="text-sm text-muted-foreground">로딩 중...</div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}

// 차트 데이터를 메모이제이션하는 헬퍼 함수
const getChartData = (
  financials: ScreenerCompany["quarterly_financials"],
  type: "revenue" | "eps"
) => {
  return prepareChartData(financials, type);
};

// 테이블 행 컴포넌트를 메모이제이션하여 불필요한 리렌더링 방지
const StockTableRow = React.memo(function StockTableRow({
  company: c,
  index: idx,
  isInWatchlist,
  onToggleWatchlist,
}: {
  company: ScreenerCompany;
  index: number;
  isInWatchlist: boolean;
  onToggleWatchlist: (symbol: string) => void;
}) {
  // 차트 데이터를 메모이제이션
  const revenueChartData = React.useMemo(
    () => getChartData(c.quarterly_financials, "revenue"),
    [c.quarterly_financials]
  );
  const epsChartData = React.useMemo(
    () => getChartData(c.quarterly_financials, "eps"),
    [c.quarterly_financials]
  );

  // 섹터 포맷팅 메모이제이션
  const sectorDisplay = React.useMemo(() => formatSector(c.sector), [c.sector]);

  return (
    <TableRow style={{ display: "table-row", width: "100%" }}>
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
                  target="_blank"
                  rel="noopener noreferrer"
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
                  c.sector && sectorDisplay.display !== c.sector
                    ? c.sector
                    : undefined
                }
              >
                <span className="block w-full truncate text-right">
                  {sectorDisplay.display}
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
                  data={revenueChartData}
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
                  data={epsChartData}
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
                  onClick={() => onToggleWatchlist(c.symbol)}
                  className="cursor-pointer"
                  aria-label={
                    isInWatchlist ? "관심종목에서 제거" : "관심종목에 추가"
                  }
                >
                  <Star
                    className={`h-5 w-5 ${
                      isInWatchlist
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
  );
});
