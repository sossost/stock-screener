"use client";

import { useEffect } from "react";
import { StateMessage } from "@/components/common/StateMessage";
import { Button } from "@/components/ui/button";

export default function AlertsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Alerts page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <StateMessage
          variant="error"
          title="알림을 불러오지 못했습니다"
          description={
            error.message ||
            "알 수 없는 오류가 발생했습니다. 다시 시도해주세요."
          }
        />
        <div className="mt-4 flex justify-center">
          <Button onClick={reset} variant="outline">
            다시 시도
          </Button>
        </div>
      </div>
    </div>
  );
}
