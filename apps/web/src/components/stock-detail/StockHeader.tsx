"use client";

import { usePortfolio } from "@/hooks/usePortfolio";
import { Button } from "@/components/ui/button";
import { Star, ArrowLeft, ExternalLink } from "lucide-react";
import { formatSector, formatIndustry } from "@/utils/sector";
import type { StockBasicInfo } from "@/types/stock-detail";
import Link from "next/link";
import { useEffect, useState } from "react";

interface StockHeaderProps {
  basic: StockBasicInfo;
}

export function StockHeader({ basic }: StockHeaderProps) {
  const { isInPortfolio, togglePortfolio, refresh } = usePortfolio(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!hasLoaded) {
      refresh().then(() => setHasLoaded(true));
    }
  }, [hasLoaded, refresh]);

  const handleTogglePortfolio = async () => {
    await togglePortfolio(basic.symbol);
  };

  const sectorDisplay = formatSector(basic.sector).display;
  const industryDisplay = formatIndustry(basic.industry).display;

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      {/* 뒤로가기 */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        스크리너로 돌아가기
      </Link>

      {/* 헤더 메인 */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          {/* 티커 + 뱃지 */}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{basic.symbol}</h1>
            {!basic.isActivelyTrading && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                거래중단
              </span>
            )}
            {basic.isEtf && (
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                ETF
              </span>
            )}
            {basic.isFund && (
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                펀드
              </span>
            )}
          </div>

          {/* 회사명 */}
          <p className="text-lg text-muted-foreground">
            {basic.companyName || "-"}
          </p>

          {/* 섹터 / 인더스트리 / 거래소 */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{sectorDisplay}</span>
            {industryDisplay !== "-" && (
              <>
                <span>•</span>
                <span>{industryDisplay}</span>
              </>
            )}
            {basic.exchangeShortName && (
              <>
                <span>•</span>
                <span>{basic.exchangeShortName}</span>
              </>
            )}
          </div>
        </div>

        {/* 액션 버튼 그룹 */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={isInPortfolio(basic.symbol) ? "default" : "outline"}
            onClick={handleTogglePortfolio}
            className="flex items-center gap-2"
          >
            <Star
              className={`h-4 w-4 ${
                isInPortfolio(basic.symbol)
                  ? "fill-current"
                  : ""
              }`}
            />
            {isInPortfolio(basic.symbol) ? "포트폴리오에서 제거" : "포트폴리오 추가"}
          </Button>
          <Button variant="outline" asChild>
            <a
              href={`https://seekingalpha.com/symbol/${basic.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Seeking Alpha
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
