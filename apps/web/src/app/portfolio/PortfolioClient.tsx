"use client";

import { useEffect, useState, useCallback } from "react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PortfolioTable } from "@/components/portfolio/PortfolioTable";
import type { ScreenerCompany } from "@/types/golden-cross";

export function PortfolioClient() {
  const { symbols, isLoading, togglePortfolio } = usePortfolio(true);
  const [portfolioData, setPortfolioData] = useState<ScreenerCompany[]>([]);
  const [tradeDate, setTradeDate] = useState<string | null>(null);

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
        throw new Error("Failed to fetch portfolio data");
      }

      const result = await response.json();
      setPortfolioData(result.data || []);
      setTradeDate(result.trade_date || null);
    } catch (error) {
      console.error("Failed to fetch portfolio data:", error);
      setPortfolioData([]);
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
        <PortfolioTable
          symbols={symbols}
          data={portfolioData}
          tradeDate={tradeDate}
          onTogglePortfolio={togglePortfolio}
        />
      </CardContent>
    </Card>
  );
}
