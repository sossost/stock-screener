"use client";

import {
  useQueryState,
  parseAsBoolean,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs";
import { useRouter } from "next/navigation";
import React, {
  useState,
  useTransition,
  useMemo,
  useDeferredValue,
  useEffect,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryFilterBox } from "@/components/filters/CategoryFilterBox";
import { CategoryFilterDialog } from "@/components/filters/CategoryFilterDialog";
import type { FilterState, FilterCategory } from "@/lib/filter-summary";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/utils/format";
// Switch 컴포넌트가 없으므로 간단한 토글 버튼 사용
import { QuarterlyBarChart } from "@/components/charts/QuarterlyBarChart";
import { Input } from "@/components/ui/input";
import { filterTickerData } from "@/lib/filter-ticker";
import { Search } from "lucide-react";

type QuarterlyFinancial = {
  period_end_date: string;
  revenue: number | null;
  net_income: number | null;
  eps_diluted: number | null;
};

type GoldenCrossCompany = {
  symbol: string;
  market_cap: string | null;
  last_close: string;
  quarterly_financials: QuarterlyFinancial[];
  profitability_status: "profitable" | "unprofitable" | "unknown";
  revenue_growth_quarters: number;
  income_growth_quarters: number;
  revenue_avg_growth_rate: number | null;
  income_avg_growth_rate: number | null;
  ordered: boolean;
  just_turned: boolean;
  pe_ratio: number | null;
  peg_ratio: number | null;
};

type GoldenCrossClientProps = {
  data: GoldenCrossCompany[];
  tradeDate: string | null;
};

/**
 * 날짜 문자열을 "Q1 2024" 형식의 분기 문자열로 변환
 * @param dateString - "2024-03-31" 형식의 날짜 문자열
 * @returns "Q1 2024" 형식의 분기 문자열
 */
function formatQuarter(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `Q${quarter} ${year}`;
}

/**
 * 재무 데이터를 차트 데이터 형식으로 변환
 * @param financials - 분기별 재무 데이터 배열
 * @param type - "revenue" 또는 "eps"
 * @returns 차트에 사용할 데이터 배열
 */
function prepareChartData(
  financials: QuarterlyFinancial[],
  type: "revenue" | "eps"
) {
  if (!financials || financials.length === 0) return [];

  return financials.map((f) => ({
    quarter: formatQuarter(f.period_end_date),
    value: type === "revenue" ? f.revenue : f.eps_diluted,
    date: f.period_end_date,
  }));
}

/**
 * PER 또는 PEG 값을 포맷팅 (소수점 2자리, null이면 "-")
 * @param value - PER 또는 PEG 값
 * @returns 포맷팅된 문자열
 */
function formatRatio(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return value.toFixed(2);
}

export default function GoldenCrossClient({
  data,
  tradeDate,
}: GoldenCrossClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // URL 쿼리 파라미터를 직접 상태로 사용
  const [ordered, setOrdered] = useQueryState(
    "ordered",
    parseAsBoolean.withDefault(true)
  );
  const [goldenCross, setGoldenCross] = useQueryState(
    "goldenCross",
    parseAsBoolean.withDefault(true)
  );
  const [justTurned, setJustTurned] = useQueryState(
    "justTurned",
    parseAsBoolean.withDefault(false)
  );
  const [lookbackDays, setLookbackDays] = useQueryState(
    "lookbackDays",
    parseAsInteger.withDefault(10)
  );
  const [profitability, setProfitability] = useQueryState(
    "profitability",
    parseAsStringLiteral([
      "all",
      "profitable",
      "unprofitable",
    ] as const).withDefault("all")
  );
  const [turnAround, setTurnAround] = useQueryState(
    "turnAround",
    parseAsBoolean.withDefault(false)
  );

  // 매출 성장성 필터 (토글)
  const [revenueGrowth, setRevenueGrowth] = useQueryState(
    "revenueGrowth",
    parseAsBoolean.withDefault(false)
  );

  // 수익 성장성 필터 (토글)
  const [incomeGrowth, setIncomeGrowth] = useQueryState(
    "incomeGrowth",
    parseAsBoolean.withDefault(false)
  );

  // 매출 성장 연속 분기 수
  const [revenueGrowthQuarters, setRevenueGrowthQuarters] = useQueryState(
    "revenueGrowthQuarters",
    parseAsInteger.withDefault(3)
  );

  // 수익 성장 연속 분기 수
  const [incomeGrowthQuarters, setIncomeGrowthQuarters] = useQueryState(
    "incomeGrowthQuarters",
    parseAsInteger.withDefault(3)
  );

  // 매출 성장률 (%)
  const [revenueGrowthRate, setRevenueGrowthRate] = useQueryState(
    "revenueGrowthRate",
    parseAsInteger
  );

  // EPS 성장률 (%)
  const [incomeGrowthRate, setIncomeGrowthRate] = useQueryState(
    "incomeGrowthRate",
    parseAsInteger
  );

  // PEG 필터 (PEG < 1)
  const [pegFilter, setPegFilter] = useQueryState(
    "pegFilter",
    parseAsBoolean.withDefault(false)
  );

  // 필터 팝업 상태 (카테고리별)
  const [openCategory, setOpenCategory] = useState<FilterCategory | null>(null);

  // 티커 검색 필터 (입력값과 실제 검색값 분리)
  const [tickerSearchInput, setTickerSearchInput] = useState<string>("");
  const [tickerSearch, setTickerSearch] = useState<string>("");

  // Debounce: 입력값이 변경된 후 300ms 후에 실제 검색값 업데이트
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setTickerSearch(tickerSearchInput.trim());
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [tickerSearchInput, startTransition]);

  // useDeferredValue로 검색 입력 최적화 (필터링은 우선순위 낮춤)
  const deferredTickerSearch = useDeferredValue(tickerSearch);

  // 티커 검색으로 필터링된 데이터 (useMemo로 최적화, deferred 값 사용)
  const filteredData = useMemo(() => {
    return filterTickerData(data, deferredTickerSearch);
  }, [data, deferredTickerSearch]);

  // 현재 필터 상태
  const currentFilterState: FilterState = {
    ordered,
    goldenCross,
    justTurned,
    lookbackDays,
    profitability,
    turnAround,
    revenueGrowth,
    revenueGrowthQuarters,
    revenueGrowthRate: revenueGrowthRate ?? null,
    incomeGrowth,
    incomeGrowthQuarters,
    incomeGrowthRate: incomeGrowthRate ?? null,
    pegFilter,
  };

  // 필터 변경 시 캐시 무효화 후 리패치
  const handleFilterChange = async (
    newOrdered: boolean,
    newGoldenCross: boolean,
    newJustTurned: boolean,
    newLookbackDays: number,
    newProfitability: "all" | "profitable" | "unprofitable",
    newTurnAround: boolean,
    newRevenueGrowth: boolean,
    newIncomeGrowth: boolean,
    newRevenueGrowthQuarters?: number,
    newIncomeGrowthQuarters?: number,
    newRevenueGrowthRate?: number | null,
    newIncomeGrowthRate?: number | null,
    newPegFilter?: boolean
  ) => {
    // 정배열 필터가 비활성화되면 "최근 전환" 옵션도 비활성화
    const finalJustTurned = newOrdered ? newJustTurned : false;

    // 이전 캐시 무효화 (모든 필터 포함)
    const oldTag = `golden-cross-${ordered}-${goldenCross}-${justTurned}-${lookbackDays}-${profitability}-${revenueGrowth}-${revenueGrowthQuarters}-${
      revenueGrowthRate ?? ""
    }-${incomeGrowth}-${incomeGrowthQuarters}-${
      incomeGrowthRate ?? ""
    }-${pegFilter}-${turnAround ?? false}`;
    await fetch("/api/cache/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: oldTag }),
    });

    // URL 업데이트
    await setOrdered(newOrdered);
    await setGoldenCross(newGoldenCross);
    await setJustTurned(finalJustTurned);
    await setLookbackDays(newLookbackDays);
    await setProfitability(newProfitability);
    await setTurnAround(newTurnAround);
    await setRevenueGrowth(newRevenueGrowth);
    await setIncomeGrowth(newIncomeGrowth);

    if (newRevenueGrowthQuarters !== undefined) {
      await setRevenueGrowthQuarters(newRevenueGrowthQuarters);
    }
    if (newIncomeGrowthQuarters !== undefined) {
      await setIncomeGrowthQuarters(newIncomeGrowthQuarters);
    }
    if (newRevenueGrowthRate !== undefined) {
      await setRevenueGrowthRate(newRevenueGrowthRate);
    }
    if (newIncomeGrowthRate !== undefined) {
      await setIncomeGrowthRate(newIncomeGrowthRate);
    }
    if (newPegFilter !== undefined) {
      await setPegFilter(newPegFilter);
    }

    // 서버 컴포넌트 리패치 (transition으로 감싸서 로딩 표시)
    startTransition(() => {
      router.refresh();
    });
  };

  // 필터 팝업에서 적용 버튼 클릭 시 (카테고리별 부분 업데이트)
  const handleFilterApply = (newState: Partial<FilterState>) => {
    handleFilterChange(
      newState.ordered ?? ordered,
      newState.goldenCross ?? goldenCross,
      newState.justTurned ?? justTurned,
      newState.lookbackDays ?? lookbackDays,
      newState.profitability ?? profitability,
      newState.turnAround ?? turnAround ?? false,
      newState.revenueGrowth ?? revenueGrowth,
      newState.incomeGrowth ?? incomeGrowth,
      newState.revenueGrowthQuarters ?? revenueGrowthQuarters,
      newState.incomeGrowthQuarters ?? incomeGrowthQuarters,
      Object.prototype.hasOwnProperty.call(newState, "revenueGrowthRate")
        ? newState.revenueGrowthRate ?? null
        : revenueGrowthRate ?? null,
      Object.prototype.hasOwnProperty.call(newState, "incomeGrowthRate")
        ? newState.incomeGrowthRate ?? null
        : incomeGrowthRate ?? null,
      Object.prototype.hasOwnProperty.call(newState, "pegFilter")
        ? newState.pegFilter ?? false
        : pegFilter
    );
  };

  // 필터 초기화 (카테고리별)
  const handleFilterReset = (category: FilterCategory) => {
    if (category === "ma") {
      handleFilterChange(
        true, // ordered
        true, // goldenCross
        false, // justTurned
        10, // lookbackDays
        profitability,
        turnAround ?? false,
        revenueGrowth,
        incomeGrowth,
        revenueGrowthQuarters,
        incomeGrowthQuarters,
        revenueGrowthRate,
        incomeGrowthRate,
        pegFilter
      );
    } else if (category === "growth") {
      handleFilterChange(
        ordered,
        goldenCross,
        justTurned,
        lookbackDays,
        profitability,
        turnAround ?? false,
        false, // revenueGrowth
        false, // incomeGrowth
        3, // revenueGrowthQuarters
        3, // incomeGrowthQuarters
        null, // revenueGrowthRate
        null, // incomeGrowthRate
        false // pegFilter
      );
    } else if (category === "profitability") {
      handleFilterChange(
        ordered,
        goldenCross,
        justTurned,
        lookbackDays,
        "all", // profitability
        false, // turnAround
        revenueGrowth,
        incomeGrowth,
        revenueGrowthQuarters,
        incomeGrowthQuarters,
        revenueGrowthRate,
        incomeGrowthRate,
        pegFilter
      );
    }
  };

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold">📈 주식 스크리너</CardTitle>
        <div className="flex items-stretch gap-3 mt-4 flex-wrap">
          {/* 이평선 필터박스 */}
          <CategoryFilterBox
            category="ma"
            filterState={currentFilterState}
            onClick={() => setOpenCategory("ma")}
            disabled={isPending}
          />

          {/* 성장성 필터박스 */}
          <CategoryFilterBox
            category="growth"
            filterState={currentFilterState}
            onClick={() => setOpenCategory("growth")}
            disabled={isPending}
          />

          {/* 수익성 필터박스 */}
          <CategoryFilterBox
            category="profitability"
            filterState={currentFilterState}
            onClick={() => setOpenCategory("profitability")}
            disabled={isPending}
          />

          {/* 티커 검색 인풋 - 필터 라인 오른쪽 끝 */}
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="티커 검색..."
              value={tickerSearchInput}
              onChange={(e) => setTickerSearchInput(e.target.value)}
              className="pl-9 w-[200px] h-12"
            />
          </div>
        </div>

        {/* 카테고리별 필터 설정 팝업 */}
        {openCategory && (
          <CategoryFilterDialog
            category={openCategory}
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                setOpenCategory(null);
              }
            }}
            filterState={currentFilterState}
            onApply={handleFilterApply}
            onReset={() => handleFilterReset(openCategory)}
            disabled={isPending}
          />
        )}
      </CardHeader>
      <CardContent>
        {isPending && !tickerSearchInput && !tickerSearch ? (
          // 서버 필터 변경 중일 때만 테이블 스켈레톤 표시 (클라이언트 검색 중에는 제외)
          <>
            <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
              <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-40 bg-gray-200 animate-pulse rounded" />
            </div>
            <Table>
              <TableCaption>
                <div className="h-4 w-64 bg-gray-200 animate-pulse rounded" />
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>종목</TableHead>
                  <TableHead className="text-right w-[200px]">
                    시가총액
                  </TableHead>
                  <TableHead className="text-right w-[140px]">종가</TableHead>
                  <TableHead className="text-right w-[100px]">PER</TableHead>
                  <TableHead className="text-right w-[100px]">PEG</TableHead>
                  <TableHead className="w-[160px] text-right">
                    매출 (8Q)
                  </TableHead>
                  <TableHead className="w-[160px] text-right">
                    EPS (8Q)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, idx) => (
                  <TableRow key={idx}>
                    {/* Symbol */}
                    <TableCell>
                      <div className="h-4 w-16 bg-gray-200 animate-pulse rounded" />
                    </TableCell>
                    {/* Market Cap */}
                    <TableCell className="text-right w-[200px]">
                      <div className="h-4 w-20 bg-gray-200 animate-pulse rounded ml-auto" />
                    </TableCell>
                    {/* Last Close */}
                    <TableCell className="text-right w-[140px]">
                      <div className="h-4 w-20 bg-gray-200 animate-pulse rounded ml-auto" />
                    </TableCell>
                    {/* PER */}
                    <TableCell className="text-right w-[100px]">
                      <div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" />
                    </TableCell>
                    {/* PEG */}
                    <TableCell className="text-right w-[100px]">
                      <div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" />
                    </TableCell>
                    {/* 매출 차트 */}
                    <TableCell className="w-[160px]">
                      <div className="h-7 w-full bg-gray-200 animate-pulse rounded" />
                    </TableCell>
                    {/* EPS 차트 */}
                    <TableCell className="w-[160px]">
                      <div className="h-7 w-full bg-gray-200 animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          // 실제 데이터 표시
          <>
            {filteredData.length > 0 && (
              <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
                <div>
                  {tickerSearch ? (
                    <>
                      검색 결과:{" "}
                      <span className="font-semibold text-blue-600">
                        {filteredData.length}
                      </span>
                      개 / 전체{" "}
                      <span className="font-semibold">{data.length}</span>개
                    </>
                  ) : (
                    <>
                      총{" "}
                      <span className="font-semibold text-blue-600">
                        {filteredData.length}
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
            {filteredData.length === 0 && tickerSearch ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-lg font-medium">검색 결과가 없습니다</p>
                <p className="mt-2 text-sm">
                  &quot;{tickerSearch}&quot;와 일치하는 종목을 찾을 수 없습니다.
                </p>
              </div>
            ) : (
              <Table>
                <TableCaption>
                  {ordered
                    ? justTurned
                      ? `최근 ${lookbackDays}일 이내에 MA20 > MA50 > MA100 > MA200 정배열로 전환한 종목`
                      : "MA20 > MA50 > MA100 > MA200 정배열 조건을 만족하는 종목"
                    : goldenCross
                    ? "MA50 > MA200 골든크로스 조건을 만족하는 종목"
                    : "모든 종목"}
                  {goldenCross && ordered && (
                    <span className="ml-2">
                      • 골든크로스 (MA50 {">"} MA200)
                    </span>
                  )}
                  {profitability !== "all" && (
                    <span className="ml-2">
                      •{" "}
                      {profitability === "profitable"
                        ? "흑자 종목만"
                        : "적자 종목만"}
                    </span>
                  )}
                  {revenueGrowth && (
                    <span className="ml-2">
                      • 매출{" "}
                      {revenueGrowthRate !== null
                        ? `${revenueGrowthQuarters}분기 연속 상승 + 평균 성장률 ${revenueGrowthRate}% 이상`
                        : `${revenueGrowthQuarters}분기 연속 상승`}{" "}
                      종목만
                    </span>
                  )}
                  {incomeGrowth && (
                    <span className="ml-2">
                      • 수익{" "}
                      {incomeGrowthRate !== null
                        ? `${incomeGrowthQuarters}분기 연속 상승 + 평균 성장률 ${incomeGrowthRate}% 이상`
                        : `${incomeGrowthQuarters}분기 연속 상승`}{" "}
                      종목만
                    </span>
                  )}
                  {pegFilter && <span className="ml-2">• PEG {"<"} 1</span>}
                  {tickerSearch && (
                    <span className="ml-2">
                      • 티커: &quot;{tickerSearch}&quot;
                    </span>
                  )}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>종목</TableHead>
                    <TableHead className="text-right w-[200px]">
                      시가총액
                    </TableHead>
                    <TableHead className="text-right w-[140px]">종가</TableHead>
                    <TableHead className="text-right w-[100px]">PER</TableHead>
                    <TableHead className="text-right w-[100px]">PEG</TableHead>
                    <TableHead className="w-[160px] text-right">
                      매출 (8Q)
                    </TableHead>
                    <TableHead className="w-[160px] text-right">
                      EPS (8Q)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((c, idx) => (
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
                        ${formatNumber(c.last_close)}
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
                          data={prepareChartData(
                            c.quarterly_financials,
                            "revenue"
                          )}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
