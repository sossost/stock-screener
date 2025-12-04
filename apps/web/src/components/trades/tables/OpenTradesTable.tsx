"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TradeListItem, PlanTarget } from "@/lib/trades/types";
import { calculateUnrealizedPnl } from "@/lib/trades/calculations";
import {
  formatPnl,
  formatRoi,
  formatDateKr,
  formatPositionValue,
  formatPrice,
  formatPercent,
  formatQuantity,
} from "@/utils/format";
import { PopupPortal } from "@/components/ui/popup-portal";
import { PriceBarPopup } from "@/components/trades/charts/PriceBarPopup";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OpenTradesTableProps {
  trades: TradeListItem[];
  totalAssets?: number;
}

export default function OpenTradesTable({
  trades,
  totalAssets,
}: OpenTradesTableProps) {
  const router = useRouter();
  const [hoveredTrade, setHoveredTrade] = useState<TradeListItem | null>(null);
  const [popupPosition, setPopupPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleMouseEnter = (
    trade: TradeListItem,
    e: React.MouseEvent<HTMLTableRowElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom,
    });
    setHoveredTrade(trade);
  };

  const handleMouseLeave = () => {
    setHoveredTrade(null);
    setPopupPosition(null);
  };

  if (trades.length === 0) return null;

  const showWeight = totalAssets !== undefined && totalAssets > 0;

  return (
    <>
      <div className="bg-white border rounded-md overflow-hidden text-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 border-b">
              <TableHead className="pl-4 font-medium text-gray-600">
                심볼
              </TableHead>
              <TableHead className="font-medium text-gray-600">전략</TableHead>
              <TableHead className="font-medium text-gray-600">
                손절가
              </TableHead>
              <TableHead className="font-medium text-gray-600">
                현재가 (전일대비)
              </TableHead>
              <TableHead className="font-medium text-gray-600">
                목표가
              </TableHead>
              <TableHead className="font-medium text-gray-600">
                평단가
              </TableHead>
              <TableHead className="font-medium text-gray-600">수량</TableHead>
              <TableHead className="font-medium text-gray-600">
                포지션
              </TableHead>
              {showWeight && (
                <TableHead className="font-medium text-gray-600">
                  비중
                </TableHead>
              )}
              <TableHead className="font-medium text-gray-600">
                미실현 손익
              </TableHead>
              <TableHead className="font-medium text-gray-600">
                실현 손익
              </TableHead>
              <TableHead className="font-medium text-gray-600">
                시작일
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => {
              const { avgEntryPrice, currentQuantity } = trade.calculated;
              const currentPrice = trade.currentPrice || 0;
              const { unrealizedPnl, unrealizedRoi } = calculateUnrealizedPnl(
                avgEntryPrice,
                currentQuantity,
                currentPrice
              );

              const stopLoss = trade.planStopLoss
                ? parseFloat(trade.planStopLoss)
                : null;
              const targets: PlanTarget[] = (
                trade.planTargets as PlanTarget[] | null
              )?.length
                ? (trade.planTargets as PlanTarget[])
                : trade.planTargetPrice
                  ? [{ price: parseFloat(trade.planTargetPrice), weight: 100 }]
                  : [];
              const firstTarget = targets[0]?.price;

              const isProfitable = unrealizedPnl > 0;
              const isLoss = unrealizedPnl < 0;

              const positionValue =
                currentPrice > 0
                  ? currentPrice * currentQuantity
                  : avgEntryPrice * currentQuantity;

              const stopLossPercent =
                stopLoss && avgEntryPrice > 0
                  ? ((stopLoss - avgEntryPrice) / avgEntryPrice) * 100
                  : null;

              const currentPercent =
                currentPrice > 0 && avgEntryPrice > 0
                  ? ((currentPrice - avgEntryPrice) / avgEntryPrice) * 100
                  : null;

              const targetPercent =
                firstTarget && avgEntryPrice > 0
                  ? ((firstTarget - avgEntryPrice) / avgEntryPrice) * 100
                  : null;

              const weight =
                showWeight && totalAssets > 0
                  ? (positionValue / totalAssets) * 100
                  : null;

              return (
                <TableRow
                  key={trade.id}
                  className="hover:bg-blue-50 cursor-pointer border-b"
                  onClick={() => router.push(`/trades/${trade.id}`)}
                  onMouseEnter={(e) => handleMouseEnter(trade, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  <TableCell className="pl-4 font-semibold">
                    {trade.symbol}
                  </TableCell>
                  <TableCell>
                    {trade.strategy ? (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {trade.strategy}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {stopLoss ? (
                      <span className="text-red-600">
                        {formatPrice(stopLoss)} (
                        {stopLossPercent !== null
                          ? formatPercent(stopLossPercent, 1)
                          : "-"}
                        )
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {currentPrice > 0 ? (
                      <div className="flex items-center gap-1">
                        <span>{formatPrice(currentPrice)}</span>
                        {trade.priceChangePercent !== null ? (
                          <span
                            className={
                              trade.priceChangePercent >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            ({trade.priceChangePercent >= 0 ? "+" : ""}
                            {formatPercent(trade.priceChangePercent, 1)})
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {firstTarget ? (
                      <span className="text-green-600">
                        {formatPrice(firstTarget)} (+
                        {targetPercent !== null
                          ? formatPercent(targetPercent, 1)
                          : "-"}
                        )
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>{formatPrice(avgEntryPrice)}</TableCell>
                  <TableCell>{formatQuantity(currentQuantity)}주</TableCell>
                  <TableCell>{formatPositionValue(positionValue)}</TableCell>
                  {showWeight && (
                    <TableCell className="text-gray-600">
                      {weight !== null ? formatPercent(weight, 1) : "-"}
                    </TableCell>
                  )}
                  <TableCell>
                    <span
                      className={`font-semibold ${isProfitable ? "text-green-600" : isLoss ? "text-red-600" : "text-gray-600"}`}
                    >
                      {formatPnl(unrealizedPnl)} ({formatRoi(unrealizedRoi)})
                    </span>
                  </TableCell>
                  <TableCell>
                    {trade.calculated.totalSellQuantity > 0 ? (
                      <span
                        className={
                          trade.calculated.realizedPnl > 0
                            ? "text-green-600"
                            : trade.calculated.realizedPnl < 0
                              ? "text-red-600"
                              : "text-gray-500"
                        }
                      >
                        {formatPnl(trade.calculated.realizedPnl)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {formatDateKr(trade.startDate)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <PopupPortal position={popupPosition}>
        {hoveredTrade && <PriceBarPopup trade={hoveredTrade} />}
      </PopupPortal>
    </>
  );
}
