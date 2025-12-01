import { Suspense } from "react";
import { ScreenerClient } from "@/app/(screener)/ScreenerClient";
import { Navigation } from "@/components/navigation";
import { TableSkeleton } from "@/app/(screener)/TableSkeleton";

export const metadata = {
  title: "주식 스크리너 | Stock Screener",
  description: "기술적 분석과 펀더멘털 분석을 위한 주식 스크리닝 도구",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation showPortfolioButton={true} />
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<TableSkeleton />}>
          <ScreenerClient />
        </Suspense>
      </div>
    </div>
  );
}
