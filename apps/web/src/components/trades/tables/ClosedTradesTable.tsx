"use client";

import { useRouter } from "next/navigation";
import { TradeListItem } from "@/lib/trades/types";
import { formatPnl, formatRoi, formatDateKr, formatPrice, formatQuantity, formatRatio } from "@/utils/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClosedTradesTableProps {
  trades: TradeListItem[];
}

export default function ClosedTradesTable({ trades }: ClosedTradesTableProps) {
  const router = useRouter();

  if (trades.length === 0) return null;

  return (
    <div className="bg-white border rounded-md overflow-hidden text-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 border-b">
            <TableHead className="pl-4 font-medium text-gray-600">심볼</TableHead>
            <TableHead className="font-medium text-gray-600">전략</TableHead>
            <TableHead className="font-medium text-gray-600">실현 손익</TableHead>
            <TableHead className="font-medium text-gray-600">수익률</TableHead>
            <TableHead className="font-medium text-gray-600">R배수</TableHead>
            <TableHead className="font-medium text-gray-600">평단 → 청산</TableHead>
            <TableHead className="font-medium text-gray-600">수량</TableHead>
            <TableHead className="font-medium text-gray-600">기간</TableHead>
            <TableHead className="font-medium text-gray-600">거래일</TableHead>
            <TableHead className="font-medium text-gray-600">복기</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => {
            const {
              avgEntryPrice,
              realizedPnl,
              realizedRoi,
              totalBuyQuantity,
              avgExitPrice,
              holdingDays,
            } = trade.calculated;

            const rMultiple = trade.finalRMultiple
              ? parseFloat(trade.finalRMultiple)
              : null;

            const isProfitable = realizedPnl > 0;
            const isLoss = realizedPnl < 0;

            return (
              <TableRow
                key={trade.id}
                className="hover:bg-gray-50 cursor-pointer border-b"
                onClick={() => router.push(`/trades/${trade.id}`)}
              >
                <TableCell className="pl-4 font-semibold">{trade.symbol}</TableCell>
                <TableCell>
                  {trade.strategy ? (
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {trade.strategy}
                    </span>
                  ) : "-"}
                </TableCell>
                <TableCell>
                  <span className={`font-semibold ${isProfitable ? "text-green-600" : isLoss ? "text-red-600" : ""}`}>
                    {formatPnl(realizedPnl)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={isProfitable ? "text-green-600" : isLoss ? "text-red-600" : ""}>
                    {formatRoi(realizedRoi)}
                  </span>
                </TableCell>
                <TableCell>
                  {rMultiple !== null ? (
                    <span className={rMultiple > 0 ? "text-green-600" : rMultiple < 0 ? "text-red-600" : ""}>
                      {rMultiple > 0 ? "+" : ""}{formatRatio(rMultiple)}R
                    </span>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-gray-600">
                  {formatPrice(avgEntryPrice)} → {avgExitPrice ? formatPrice(avgExitPrice) : "-"}
                </TableCell>
                <TableCell>{formatQuantity(totalBuyQuantity)}주</TableCell>
                <TableCell>
                  {holdingDays !== undefined ? `${holdingDays}일` : "-"}
                </TableCell>
                <TableCell className="text-gray-500">
                  {formatDateKr(trade.startDate)} ~ {formatDateKr(trade.endDate)}
                </TableCell>
                <TableCell>
                  {trade.mistakeType ? (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      trade.mistakeType === "원칙준수"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {trade.mistakeType}
                    </span>
                  ) : <span className="text-gray-400">-</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
