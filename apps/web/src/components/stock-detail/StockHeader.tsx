"use client";

import { usePortfolio } from "@/hooks/usePortfolio";
import { Button } from "@/components/ui/button";
import { Star, ArrowLeft, ExternalLink, TrendingUp } from "lucide-react";
import TradeForm from "@/components/trades/forms/TradeForm";
import { formatSector, formatIndustry } from "@/utils/sector";
import { formatNumber, formatPrice } from "@/utils/format";
import type {
  StockBasicInfo,
  StockPriceInfo,
  StockMAStatus,
  StockRatios,
} from "@/types/stock-detail";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MAStatusBadge } from "./MAStatusBadge";

interface StockHeaderProps {
  basic: StockBasicInfo;
  price: StockPriceInfo;
  maStatus: StockMAStatus;
  ratios?: StockRatios | null;
}

// 비율 포맷
function formatRatio(value: string | null): string {
  if (!value) return "-";
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return "-";
  return num.toFixed(2);
}

// 데이터 셀 컴포넌트
function DataCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span
        className={`text-xs font-medium ${
          highlight ? "text-blue-600" : "text-gray-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function StockHeader({
  basic,
  price,
  maStatus,
  ratios,
}: StockHeaderProps) {
  const router = useRouter();
  const { isInPortfolio, togglePortfolio, refresh } = usePortfolio(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!hasLoaded) {
      refresh()
        .then(() => {
          if (isMounted) setHasLoaded(true);
        })
        .catch((err) => {
          console.error("[StockHeader] refresh error:", err);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [hasLoaded, refresh]);

  const handleTogglePortfolio = async () => {
    try {
      await togglePortfolio(basic.symbol);
    } catch (err) {
      console.error("[StockHeader] togglePortfolio error:", err);
    }
  };

  const sectorDisplay = formatSector(basic.sector).display;
  const industryDisplay = formatIndustry(basic.industry).display;
  const inPortfolio = isInPortfolio(basic.symbol);

  return (
    <div className="space-y-3">
      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button onClick={() => window.close()} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
          스크리너로 돌아가기
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowTradeForm(true)}
            className="h-8 gap-1 text-xs bg-blue-500 hover:bg-blue-600"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            매매 시작
          </Button>
          <Button
            variant={inPortfolio ? "default" : "outline"}
            size="sm"
            onClick={handleTogglePortfolio}
            className={`h-8 gap-1 text-xs ${
              inPortfolio
                ? "bg-amber-500 hover:bg-amber-600 border-amber-500"
                : ""
            }`}
          >
            <Star
              className={`h-3.5 w-3.5 ${inPortfolio ? "fill-current" : ""}`}
            />
            {inPortfolio ? "저장됨" : "저장"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 gap-1.5 text-xs"
          >
            <a
              href={`https://seekingalpha.com/symbol/${basic.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Seeking Alpha
            </a>
          </Button>
        </div>
      </div>

      {/* 메인 정보 카드 */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="p-4 flex flex-col lg:flex-row lg:items-start gap-4">
          {/* 왼쪽: 기업 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">
                {basic.symbol}
              </h1>
              {!basic.isActivelyTrading && (
                <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                  거래중단
                </span>
              )}
              {basic.isEtf && (
                <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded">
                  ETF
                </span>
              )}
              <span className="text-xs text-gray-400">
                {basic.exchangeShortName}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate mt-0.5">
              {basic.companyName || "-"}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
              <span>{sectorDisplay}</span>
              {industryDisplay !== "-" && (
                <>
                  <span>•</span>
                  <span className="truncate">{industryDisplay}</span>
                </>
              )}
            </div>
          </div>

          {/* 중앙: 가격 정보 */}
          <div className="flex gap-6 lg:gap-8">
            {/* 현재가 */}
            <div>
              <div className="text-xs text-gray-500">현재가</div>
              <div className="text-xl font-bold text-gray-900">
                {formatPrice(price.lastClose)}
              </div>
              <div className="text-[10px] text-gray-400">{price.date}</div>
            </div>

            {/* 시가총액 */}
            <div>
              <div className="text-xs text-gray-500">시가총액</div>
              <div className="text-xl font-bold text-gray-900">
                {basic.marketCap ? formatNumber(basic.marketCap) : "-"}
              </div>
            </div>

            {/* RS Score */}
            <div>
              <div className="text-xs text-gray-500">RS Score</div>
              <div className="text-xl font-bold text-blue-600">
                {price.rsScore ?? "-"}
              </div>
            </div>

            {/* 기술적 상태 */}
            <div>
              <div className="text-xs text-gray-500">상태</div>
              <div className="mt-0.5">
                {maStatus.ordered || maStatus.goldenCross ? (
                  <MAStatusBadge status={maStatus} />
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 밸류에이션 */}
          {ratios && (
            <div className="lg:w-40 lg:border-l lg:pl-4">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                밸류에이션
              </div>
              <DataCell
                label="P/E"
                value={formatRatio(ratios.valuation.peRatio)}
              />
              <DataCell
                label="P/S"
                value={formatRatio(ratios.valuation.psRatio)}
              />
              <DataCell
                label="P/B"
                value={formatRatio(ratios.valuation.pbRatio)}
              />
              <DataCell
                label="EV/EBITDA"
                value={formatRatio(ratios.valuation.evEbitda)}
              />
            </div>
          )}
        </div>
      </div>

      {/* 매매 시작 모달 */}
      {showTradeForm && (
        <TradeForm
          defaultSymbol={basic.symbol}
          onClose={() => setShowTradeForm(false)}
          onCreated={() => {
            setShowTradeForm(false);
            // 매매일지 페이지로 이동
            router.push("/trades");
          }}
        />
      )}
    </div>
  );
}
