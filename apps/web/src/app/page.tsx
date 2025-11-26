import React from "react";
import { DataWrapper } from "@/app/(screener)/DataWrapper";
import { Navigation } from "@/components/navigation";

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
      <Navigation showPortfolioButton={true} />
      <div className="container mx-auto px-4 py-8">
        <DataWrapper searchParams={resolvedParams} />
      </div>
    </div>
  );
};

export default Home;
