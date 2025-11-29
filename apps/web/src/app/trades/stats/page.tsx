import { Suspense } from "react";
import StatsClient from "./StatsClient";

export const metadata = {
  title: "매매 통계 | Stock Screener",
  description: "매매 성과 분석 및 통계",
};

export default function StatsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      }
    >
      <StatsClient />
    </Suspense>
  );
}
