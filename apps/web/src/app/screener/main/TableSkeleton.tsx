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

export function TableSkeleton() {
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
              <TableHead>종목</TableHead>
              <TableHead className="text-right w-[200px]">
                시가총액
              </TableHead>
              <TableHead className="text-right w-[140px]">종가</TableHead>
              <TableHead className="text-right w-[100px]">PER</TableHead>
              <TableHead className="text-right w-[100px]">PEG</TableHead>
              <TableHead className="w-[160px] text-right">
                매출 (8Q)
              </TableHead>
              <TableHead className="w-[160px] text-right">
                EPS (8Q)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell className="text-right w-[200px]">
                  <Skeleton className="h-4 w-20 ml-auto" />
                </TableCell>
                <TableCell className="text-right w-[140px]">
                  <Skeleton className="h-4 w-20 ml-auto" />
                </TableCell>
                <TableCell className="text-right w-[100px]">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell className="text-right w-[100px]">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell className="w-[160px]">
                  <Skeleton className="h-7 w-full" />
                </TableCell>
                <TableCell className="w-[160px]">
                  <Skeleton className="h-7 w-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </>
  );
}
