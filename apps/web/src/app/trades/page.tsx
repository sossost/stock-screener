import { Suspense } from "react";
import TradesClient from "./TradesClient";

export const metadata = {
  title: "매매일지 | Stock Screener",
  description: "매매 기록 및 복기",
};

export default function TradesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      }
    >
      <TradesClient />
    </Suspense>
  );
}

