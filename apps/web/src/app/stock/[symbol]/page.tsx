import { notFound } from "next/navigation";
import { getStockDetail } from "@/lib/stock-detail";
import { StockDetailClient } from "./StockDetailClient";
import type { Metadata } from "next";

interface StockPageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({
  params,
}: StockPageProps): Promise<Metadata> {
  const { symbol } = await params;
  const data = await getStockDetail(symbol);

  if (!data) {
    return {
      title: "종목을 찾을 수 없습니다",
    };
  }

  return {
    title: `${data.basic.symbol} - ${data.basic.companyName || "종목 상세"}`,
    description: `${data.basic.symbol} 종목의 상세 정보, 가격, 이동평균선 상태를 확인하세요.`,
  };
}

export default async function StockPage({ params }: StockPageProps) {
  const { symbol } = await params;
  const data = await getStockDetail(symbol);

  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <StockDetailClient data={data} />
      </div>
    </main>
  );
}
