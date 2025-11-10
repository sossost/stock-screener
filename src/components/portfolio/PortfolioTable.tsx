"use client";

import type { ScreenerCompany } from "@/types/golden-cross";
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
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import Link from "next/link";

interface PortfolioTableProps {
  symbols: string[];
  data?: ScreenerCompany[];
  tradeDate?: string | null;
  onTogglePortfolio: (symbol: string) => Promise<boolean>;
}

export function PortfolioTable({
  symbols,
  data = [],
  tradeDate,
  onTogglePortfolio,
}: PortfolioTableProps) {
  const portfolioData = data.filter((item) => symbols.includes(item.symbol));

  if (symbols.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-lg font-medium">포트폴리오가 비어있습니다</p>
        <p className="mt-2 text-sm">
          스크리너에서 종목을 추가하여 포트폴리오를 구성하세요.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          스크리너로 이동 →
        </Link>
      </div>
    );
  }

  if (portfolioData.length === 0 && symbols.length > 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-lg font-medium">데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
        <div>
          총{" "}
          <span className="font-semibold text-blue-600">
            {portfolioData.length}
          </span>
          개 종목
        </div>
        {tradeDate && (
          <div className="text-gray-500">
            기준일: <span className="font-semibold">{tradeDate}</span>
          </div>
        )}
      </div>
      <Table>
        <TableCaption>
          포트폴리오에 저장된 종목 목록 ({portfolioData.length}개)
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
          {portfolioData.map((c, idx) => (
            <TableRow key={`${c.symbol}-${idx}`}>
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

              <TableCell className="text-right font-medium w-[200px]">
                {c.market_cap ? formatNumber(c.market_cap) : "-"}
              </TableCell>

              <TableCell className="text-right w-[140px]">
                {formatPrice(c.last_close)}
              </TableCell>

              <TableCell className="text-right w-[100px]">
                {formatRatio(c.pe_ratio)}
              </TableCell>

              <TableCell className="text-right w-[100px]">
                {formatRatio(c.peg_ratio)}
              </TableCell>

              <TableCell className="w-[160px]">
                <QuarterlyBarChart
                  data={prepareChartData(c.quarterly_financials, "revenue")}
                  type="revenue"
                  height={28}
                  width={160}
                />
              </TableCell>

              <TableCell className="w-[160px]">
                <QuarterlyBarChart
                  data={prepareChartData(c.quarterly_financials, "eps")}
                  type="eps"
                  height={28}
                  width={160}
                />
              </TableCell>

              <TableCell className="w-[80px] text-center">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onTogglePortfolio(c.symbol)}
                  className="cursor-pointer"
                  aria-label="포트폴리오에서 제거"
                >
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
