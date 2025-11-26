"use client";

import { useEffect, useState, useCallback } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ScreenerCompany } from "@/types/golden-cross";
import { StateMessage } from "@/components/common/StateMessage";
import { StockTable } from "@/components/screener/StockTable";
import { portfolioFilterState } from "@/components/portfolio/PortfolioTableClient";

export function PortfolioClient() {
  const { symbols, isLoading } = usePortfolio(true);
  const [portfolioData, setPortfolioData] = useState<ScreenerCompany[]>([]);
  const [tradeDate, setTradeDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 포트폴리오 심볼이 변경되면 최신 재무 데이터 조회 (캐싱 적용)
  const fetchPortfolioData = useCallback(async () => {
    if (symbols.length === 0) {
      setPortfolioData([]);
      return;
    }

    try {
      // 포트폴리오 API에서 재무 데이터 포함하여 조회 (서버 측 캐싱 활용)
      const response = await fetch("/api/portfolio?includeData=true", {
        cache: "force-cache",
      });

      if (!response.ok) {
        throw new Error(`포트폴리오 데이터를 가져오지 못했습니다. (status ${response.status})`);
      }

      const result = await response.json();
      setPortfolioData(result.data || []);
      setTradeDate(result.trade_date || null);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch portfolio data:", error);
      setPortfolioData([]);
      setError("포트폴리오 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }, [symbols]);

  useEffect(() => {
    if (!isLoading) {
      fetchPortfolioData();
    }
  }, [symbols, isLoading, fetchPortfolioData]);

  return (
    <Card className="p-4 pt-0">
      <CardHeader className="pt-6">
        <h2 className="text-2xl font-bold text-slate-900">내 포트폴리오</h2>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <StateMessage title="포트폴리오를 불러오는 중입니다" />
        ) : error ? (
          <StateMessage variant="error" title="불러오기 실패" description={error} />
        ) : symbols.length === 0 ? (
          <StateMessage title="포트폴리오가 비어 있습니다" description="종목을 추가해 포트폴리오를 구성해 보세요." />
        ) : (
          <StockTable
            data={portfolioData.filter((item) => symbols.includes(item.symbol))}
            filterState={portfolioFilterState}
            tradeDate={tradeDate ?? undefined}
            totalCount={portfolioData.length}
          />
        )}
      </CardContent>
    </Card>
  );
}
