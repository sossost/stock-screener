import { Skeleton } from "@/components/ui/skeleton";

/**
 * 필터 UI 스켈레톤
 * 초기화 완료 전까지 필터 박스와 검색 인풋의 스켈레톤을 표시
 */
export function FilterSkeleton() {
  return (
    <div className="flex items-stretch gap-3 flex-wrap">
      {/* 필터 박스 스켈레톤 (4개) */}
      {Array.from({ length: 4 }).map((_, idx) => (
        <Skeleton
          key={idx}
          className="h-12 w-[140px] rounded-lg flex-shrink-0"
        />
      ))}

      {/* 검색 인풋 스켈레톤 */}
      <div className="relative ml-auto">
        <Skeleton className="h-12 w-[200px] rounded-md" />
      </div>
    </div>
  );
}

