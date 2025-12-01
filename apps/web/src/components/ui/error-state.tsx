import Link from "next/link";
import { Button } from "./button";

interface ErrorStateProps {
  message: string;
  retry?: () => void;
  backHref?: string;
  backLabel?: string;
}

export function ErrorState({
  message,
  retry,
  backHref,
  backLabel = "돌아가기",
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="text-4xl">⚠️</div>
      <p className="text-red-500">{message}</p>
      <div className="flex gap-2">
        {retry && (
          <Button variant="outline" onClick={retry}>
            다시 시도
          </Button>
        )}
        {backHref && (
          <Button variant="link" asChild>
            <Link href={backHref}>← {backLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
