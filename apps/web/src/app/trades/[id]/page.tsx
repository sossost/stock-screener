import { Suspense } from "react";
import TradeDetailClient from "./TradeDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TradeDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      }
    >
      <TradeDetailClient tradeId={id} />
    </Suspense>
  );
}

