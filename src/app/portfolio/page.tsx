import React from "react";
import { PortfolioDataWrapper } from "./PortfolioDataWrapper";
import { PortfolioClientWrapper } from "./PortfolioClientWrapper";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const PortfolioPage = async () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation showPortfolioButton={false} />
      <div className="container mx-auto px-4 py-8">
        <Card className="px-4 pb-4">
          <CardHeader className="pt-4 px-4">
            <h2 className="text-2xl font-bold text-slate-900">내 포트폴리오</h2>
          </CardHeader>
          <CardContent className="px-4">
            <PortfolioDataWrapper />
          </CardContent>
        </Card>
        <PortfolioClientWrapper />
      </div>
    </div>
  );
};

export default PortfolioPage;

