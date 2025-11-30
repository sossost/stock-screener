"use client";

import React, { Suspense } from "react";
import { DataWrapper } from "@/app/(screener)/DataWrapper";
import { Navigation } from "@/components/navigation";
import { TableSkeleton } from "@/app/(screener)/TableSkeleton";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation showPortfolioButton={true} />
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<TableSkeleton />}>
          <DataWrapper />
        </Suspense>
      </div>
    </div>
  );
}
