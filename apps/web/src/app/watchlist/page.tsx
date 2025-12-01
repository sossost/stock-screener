import React from "react";
import { WatchlistDataWrapper } from "./WatchlistDataWrapper";
import { WatchlistClientWrapper } from "./WatchlistClientWrapper";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

const WatchlistPage = async () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="관심종목" backHref="/" backLabel="← 스크리너" />
      <main className="container mx-auto px-4 py-6">
        <Card className="px-4 pb-4">
          <CardContent className="px-4 pt-6">
            <WatchlistDataWrapper />
          </CardContent>
        </Card>
      </main>
      <WatchlistClientWrapper />
    </div>
  );
};

export default WatchlistPage;


