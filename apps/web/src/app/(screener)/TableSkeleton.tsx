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
      <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Table>
        <TableCaption>
          <Skeleton className="h-4 w-64" />
        </TableCaption>
        <TableHeader>
          <TableRow>
            {screenerColumns.map((col) => (
              <TableHead
                key={col.key}
                className={`${col.width ?? ""} ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : ""
                }`}
              >
                {col.label}
              </TableHead>
            ))}
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
                  return (
                    <TableCell key={col.key} className={`${alignClass} ${widthClass}`}>
                      <Skeleton className="h-7 w-full" />
                    </TableCell>
                  );
                }

                if (col.type === "action") {
                  return (
                    <TableCell key={col.key} className={`${alignClass} ${widthClass}`}>
                      <Skeleton className="h-5 w-8 mx-auto" />
                    </TableCell>
                  );
                }

                return (
                  <TableCell
                    key={col.key}
                    className={`${alignClass} ${widthClass}`}
                  >
                    <Skeleton
                      className={`h-4 ${col.skeletonWidth ?? "w-16"} ${
                        col.align === "right" ? "ml-auto" : ""
                      }`}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
