import { Skeleton } from "@/components/ui/skeleton";

export default function StockDetailLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* 헤더 카드 */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-36" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>

          {/* 지표 그리드 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border bg-white p-4 shadow-sm">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="mt-2 h-8 w-24" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
