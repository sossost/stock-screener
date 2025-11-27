import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function StockNotFound() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-4xl font-bold text-slate-900">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          요청하신 종목을 찾을 수 없습니다.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          티커가 올바른지 확인해 주세요.
        </p>
        <Button asChild className="mt-8">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            스크리너로 돌아가기
          </Link>
        </Button>
      </div>
      </div>
    </main>
  );
}

