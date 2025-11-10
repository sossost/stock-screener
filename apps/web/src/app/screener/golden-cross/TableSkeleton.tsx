import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton() {
  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          📈 주식 스크리너
        </CardTitle>
        <div className="flex items-stretch gap-3 mt-4 flex-wrap">
          {/* 이평선 필터박스 스켈레톤 */}
          <Skeleton className="h-12 w-[140px] rounded-lg" />
          {/* 성장성 필터박스 스켈레톤 */}
          <Skeleton className="h-12 w-[140px] rounded-lg" />
          {/* 수익성 필터박스 스켈레톤 */}
          <Skeleton className="h-12 w-[140px] rounded-lg" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Table>
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
      </CardContent>
    </Card>
  );
}
