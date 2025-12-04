import React, { Suspense } from "react";
import { AlertsClient } from "@/components/alerts/AlertsClient";
import { PageHeader } from "@/components/ui/page-header";
import { AlertsSkeleton } from "@/components/alerts/AlertsSkeleton";

export const metadata = {
  title: "가격 알림 | Stock Screener",
  description: "돌파 감지 알림 종목 목록",
};

export default function AlertsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="가격 알림" backHref="/" backLabel="← 스크리너" />
      <main className="container mx-auto px-4 py-3">
        <Suspense fallback={<AlertsSkeleton />}>
          <AlertsClient />
        </Suspense>
      </main>
    </div>
  );
}
