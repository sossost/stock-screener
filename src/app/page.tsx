import React, { Suspense } from "react";
import { DataWrapper } from "@/app/screener/main/DataWrapper";
import { TableSkeleton } from "@/app/screener/main/TableSkeleton";

type SearchParams = {
  justTurned?: string;
  lookbackDays?: string;
  profitability?: string;
  revenueGrowth?: string;
  revenueGrowthQuarters?: string;
  revenueGrowthRate?: string;
  incomeGrowth?: string;
  incomeGrowthQuarters?: string;
  incomeGrowthRate?: string;
  goldenCross?: string;
};

const Home = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const resolvedParams = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<TableSkeleton />}>
          <DataWrapper searchParams={resolvedParams} />
        </Suspense>
      </div>
    </div>
  );
};

export default Home;
