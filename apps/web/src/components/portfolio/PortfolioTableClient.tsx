"use client";

import { usePortfolio } from "@/hooks/usePortfolio";
import { PortfolioTable } from "./PortfolioTable";
import type { ScreenerCompany } from "@/types/golden-cross";

interface PortfolioTableClientProps {
  symbols: string[];
  data: ScreenerCompany[];
  tradeDate: string | null;
}

export function PortfolioTableClient({
  symbols,
  data,
  tradeDate,
}: PortfolioTableClientProps) {
  const { togglePortfolio } = usePortfolio(false);

  return (
    <PortfolioTable
      symbols={symbols}
      data={data}
      tradeDate={tradeDate}
      onTogglePortfolio={togglePortfolio}
    />
  );
}

