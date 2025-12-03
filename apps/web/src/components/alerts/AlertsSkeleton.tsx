import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { screenerColumns } from "@/components/screener/columns";

/**
 * 알림 페이지 전용 스켈레톤
 * 실제 렌더링과 동일한 레이아웃 유지 (FilterTabs + 날짜별 Card + 테이블)
 */
export function AlertsSkeleton() {
  return (
    <div className="space-y-4">
      {/* FilterTabs 스켈레톤 */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-40 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* 날짜별 Card 스켈레톤 (3개) */}
      {Array.from({ length: 3 }).map((_, dateIdx) => (
        <Card key={dateIdx} className="px-4 pb-4">
          <CardContent className="px-4 pt-4">
            <div className="space-y-3">
              {/* 날짜 헤더 스켈레톤 (text-xl font-semibold) */}
              <Skeleton className="h-7 w-48" />

              {/* 테이블 스켈레톤 */}
              <Table>
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
                  {Array.from({ length: 5 }).map((_, rowIdx) => (
                    <TableRow key={rowIdx}>
                      {screenerColumns.map((col) => {
                        const alignClass =
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                              ? "text-center"
                              : "";
                        const widthClass = col.width ?? "";

                        if (col.type === "chart") {
                          return (
                            <TableCell
                              key={col.key}
                              className={`${alignClass} ${widthClass}`}
                            >
                              <Skeleton className="h-7 w-[160px] ml-auto" />
                            </TableCell>
                          );
                        }

                        if (col.type === "action") {
                          return (
                            <TableCell
                              key={col.key}
                              className={`${alignClass} ${widthClass}`}
                            >
                              <Skeleton className="h-5 w-5 mx-auto rounded" />
                            </TableCell>
                          );
                        }

                        switch (col.key) {
                          case "index":
                            return (
                              <TableCell
                                key={col.key}
                                className={`${alignClass} ${widthClass} text-sm text-muted-foreground`}
                              >
                                <Skeleton className="h-4 w-6 mx-auto" />
                              </TableCell>
                            );

                          case "symbol":
                            return (
                              <TableCell
                                key={col.key}
                                className={`${alignClass} ${widthClass} font-semibold`}
                              >
                                <Skeleton className="h-4 w-16" />
                              </TableCell>
                            );

                          case "sector":
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
                            return (
                              <TableCell
                                key={col.key}
                                className={`${alignClass} ${widthClass} font-medium`}
                              >
                                <Skeleton className="h-4 w-24 ml-auto" />
                              </TableCell>
                            );

                          case "last_close":
                            return (
                              <TableCell
                                key={col.key}
                                className={`${alignClass} ${widthClass}`}
                              >
                                <Skeleton className="h-4 w-20 ml-auto" />
                              </TableCell>
                            );

                          case "rs_score":
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
                            return (
                              <TableCell
                                key={col.key}
                                className={`${alignClass} ${widthClass}`}
                              >
                                <Skeleton className="h-4 w-16 ml-auto" />
                              </TableCell>
                            );

                          default:
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

