import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { screenerColumns } from "@/components/screener/columns";

type TableSkeletonProps = {
  rows?: number;
};

export function TableSkeleton({ rows = 10 }: TableSkeletonProps) {
  return (
    <>
      {/* 테이블 위 정보 영역 - 실제와 완전히 동일한 구조 (조건부 렌더링 없이 항상 표시) */}
      <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
        <div>
          <Skeleton className="h-4 w-32 inline-block" />
        </div>
        <div className="text-gray-500">
          <Skeleton className="h-4 w-40 inline-block" />
        </div>
      </div>
      <Table>
          <TableCaption>
            <Skeleton className="h-4 w-64 inline-block" />
          </TableCaption>
          <TableHeader>
            <TableRow>
              {screenerColumns.map((col) => {
                const className = [
                  col.width ?? "",
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <TableHead key={col.key} className={className}>
                    {col.label}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, idx) => (
              <TableRow key={idx}>
                {screenerColumns.map((col) => {
                  const alignClass =
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "";
                  const widthClass = col.width ?? "";

                  if (col.type === "chart") {
                    // 차트: height={28}, width={160}, 오른쪽 정렬
                    return (
                      <TableCell key={col.key} className={`${alignClass} ${widthClass}`}>
                        <Skeleton className="h-7 w-[160px] ml-auto" />
                      </TableCell>
                    );
                  }

                  if (col.type === "action") {
                    // 액션: 중앙 정렬, h-5 w-5 아이콘
                    return (
                      <TableCell key={col.key} className={`${alignClass} ${widthClass}`}>
                        <Skeleton className="h-5 w-5 mx-auto rounded" />
                      </TableCell>
                    );
                  }

                  // 각 셀을 실제 구조와 정확히 일치시킴
                  switch (col.key) {
                    case "index":
                      // 인덱스: text-sm text-muted-foreground, 중앙 정렬, 숫자만
                      return (
                        <TableCell
                          key={col.key}
                          className={`${alignClass} ${widthClass} text-sm text-muted-foreground`}
                        >
                          <Skeleton className="h-4 w-6 mx-auto" />
                        </TableCell>
                      );
                    
                    case "symbol":
                      // symbol: font-semibold, 왼쪽 정렬, Link로 감싸짐
                      return (
                        <TableCell
                          key={col.key}
                          className={`${alignClass} ${widthClass} font-semibold`}
                        >
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      );
                    
                    case "sector":
                      // sector: block w-full truncate text-right span으로 감싸짐
                      return (
                        <TableCell
                          key={col.key}
                          className={`${alignClass} ${widthClass}`}
                        >
                          <span className="block w-full truncate text-right">
                            <Skeleton className="h-4 w-20 ml-auto" />
                          </span>
                        </TableCell>
                      );
                    
                    case "market_cap":
                      // market_cap: font-medium, 오른쪽 정렬
                      return (
                        <TableCell
                          key={col.key}
                          className={`${alignClass} ${widthClass} font-medium`}
                        >
                          <Skeleton className="h-4 w-24 ml-auto" />
                        </TableCell>
                      );
                    
                    case "last_close":
                      // last_close: 기본, 오른쪽 정렬
                      return (
                        <TableCell
                          key={col.key}
                          className={`${alignClass} ${widthClass}`}
                        >
                          <Skeleton className="h-4 w-20 ml-auto" />
                        </TableCell>
                      );
                    
                    case "rs_score":
                      // rs_score: font-semibold, 오른쪽 정렬
                      return (
                        <TableCell
                          key={col.key}
                          className={`${alignClass} ${widthClass} font-semibold`}
                        >
                          <Skeleton className="h-4 w-12 ml-auto" />
                        </TableCell>
                      );
                    
                    case "pe_ratio":
                    case "peg_ratio":
                      // pe_ratio, peg_ratio: 기본, 오른쪽 정렬
                      return (
                        <TableCell
                          key={col.key}
                          className={`${alignClass} ${widthClass}`}
                        >
                          <Skeleton className="h-4 w-16 ml-auto" />
                        </TableCell>
                      );
                    
                    default:
                      // 기본 셀
                      return (
                        <TableCell
                          key={col.key}
                          className={`${alignClass} ${widthClass}`}
                        >
                          {col.align === "right" ? (
                            <Skeleton className="h-4 w-16 ml-auto" />
                          ) : (
                            <Skeleton className="h-4 w-16" />
                          )}
                        </TableCell>
                      );
                  }
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </>
  );
}
