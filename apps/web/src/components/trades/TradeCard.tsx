"use client";

import Link from "next/link";
import { TradeListItem, PlanTarget } from "@/lib/trades/types";

interface TradeCardProps {
  trade: TradeListItem & { planTargets?: PlanTarget[] | null };
}

export default function TradeCard({ trade }: TradeCardProps) {
  const isOpen = trade.status === "OPEN";
  const { avgEntryPrice, currentQuantity, realizedPnl, realizedRoi } =
    trade.calculated;

  // 미실현 손익 계산 (OPEN 상태일 때)
  const unrealizedPnl =
    isOpen && trade.currentPrice && currentQuantity > 0
      ? (trade.currentPrice - avgEntryPrice) * currentQuantity
      : 0;
  const unrealizedRoi =
    isOpen && avgEntryPrice > 0 && currentQuantity > 0
      ? unrealizedPnl / (avgEntryPrice * currentQuantity)
      : 0;

  // 표시할 손익
  const displayPnl = isOpen ? unrealizedPnl : realizedPnl;
  const displayRoi = isOpen ? unrealizedRoi : realizedRoi;
  const isProfitable = displayPnl > 0;
  const isLoss = displayPnl < 0;

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  const getPercent = (price: number) => {
    if (avgEntryPrice <= 0) return null;
    return ((price - avgEntryPrice) / avgEntryPrice) * 100;
  };

  // 목표가 배열
  const targets: PlanTarget[] = trade.planTargets?.length
    ? trade.planTargets
    : trade.planTargetPrice
      ? [{ price: parseFloat(trade.planTargetPrice), weight: 100 }]
      : [];

  const stopLoss = trade.planStopLoss ? parseFloat(trade.planStopLoss) : null;
  const currentPrice = trade.currentPrice || 0;

  // 차트 계산: 손절가 = 0%, 최고 목표가 = 100%
  const maxTarget = targets.length > 0 ? Math.max(...targets.map((t) => t.price)) : null;
  
  // 차트 표시 조건: 손절가와 목표가가 모두 있어야 함
  const showChart = stopLoss !== null && maxTarget !== null;
  
  const chartMin = stopLoss || 0;
  const chartMax = maxTarget || 0;
  const chartRange = chartMax - chartMin;

  const getPosition = (price: number) => {
    if (chartRange === 0) return 50;
    // 손절가 = 0%, 최고 목표가 = 100%
    const pos = ((price - chartMin) / chartRange) * 100;
    // 범위 제한 (0% ~ 100%)
    return Math.max(0, Math.min(100, pos));
  };

  return (
    <Link href={`/trades/${trade.id}`}>
      <div className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow cursor-pointer">
        {/* 헤더: 심볼 + 전략 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-gray-900">
              {trade.symbol}
            </span>
            {trade.strategy && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {trade.strategy}
              </span>
            )}
          </div>
          <div className="text-right">
            <span
              className={`font-bold text-lg ${
                isProfitable
                  ? "text-green-600"
                  : isLoss
                    ? "text-red-600"
                    : "text-gray-600"
              }`}
            >
              {formatCurrency(displayPnl)} ({formatPercent(displayRoi)})
            </span>
          </div>
        </div>

        {/* 가격 바 차트 */}
        {showChart && (
          <div className="mb-3 px-4">
            {/* 현재가 레전드 (위) */}
            {isOpen && currentPrice > 0 && (
              <div className="relative h-4 mb-1 text-[10px]">
                <div
                  className="absolute whitespace-nowrap"
                  style={{ left: `${getPosition(currentPrice)}%`, transform: "translateX(-50%)" }}
                >
                  <span className={`font-medium ${currentPrice >= avgEntryPrice ? "text-blue-600" : "text-red-500"}`}>
                    현재 ${currentPrice.toFixed(2)}
                    {avgEntryPrice > 0 && (
                      <span className="ml-0.5">
                        ({getPercent(currentPrice)! >= 0 ? "+" : ""}{getPercent(currentPrice)!.toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="relative h-3">
              {/* 베이스 바 */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-gray-200 rounded-full" />

              {/* 평단가~현재가 영역 표시 */}
              {isOpen && avgEntryPrice > 0 && currentPrice > 0 && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full ${
                    currentPrice >= avgEntryPrice ? "bg-blue-300" : "bg-red-300"
                  }`}
                  style={{
                    left: `${Math.min(getPosition(avgEntryPrice), getPosition(currentPrice))}%`,
                    width: `${Math.abs(getPosition(currentPrice) - getPosition(avgEntryPrice))}%`,
                  }}
                />
              )}

              {/* 손절가 점 (항상 왼쪽 끝) */}
              {stopLoss && (
                <div
                  className="absolute top-1/2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow z-10"
                  style={{ left: "0%", transform: "translate(-50%, -50%)" }}
                />
              )}

              {/* 평단가 점 */}
              {avgEntryPrice > 0 && (
                <div
                  className="absolute top-1/2 w-2.5 h-2.5 bg-gray-700 rounded-full border-2 border-white shadow z-20"
                  style={{ left: `${getPosition(avgEntryPrice)}%`, transform: "translate(-50%, -50%)" }}
                />
              )}

              {/* 현재가 점 */}
              {isOpen && currentPrice > 0 && (
                <div
                  className="absolute top-1/2 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white shadow z-30"
                  style={{ left: `${getPosition(currentPrice)}%`, transform: "translate(-50%, -50%)" }}
                />
              )}

              {/* 목표가 점들 */}
              {targets.map((target, index) => (
                <div
                  key={index}
                  className="absolute top-1/2 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow z-10"
                  style={{ left: `${getPosition(target.price)}%`, transform: "translate(-50%, -50%)" }}
                />
              ))}
            </div>

            {/* 레전드 (아래) - 손절, 평단, 목표 */}
            <div className="relative h-4 mt-1 text-[10px]">
              {/* 손절가 (왼쪽 끝) */}
              {stopLoss && (
                <div className="absolute left-0 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-red-500 font-medium">손절 ${stopLoss.toFixed(0)}</span>
                </div>
              )}

              {/* 평단가 */}
              {avgEntryPrice > 0 && (
                <div
                  className="absolute whitespace-nowrap"
                  style={{ left: `${getPosition(avgEntryPrice)}%`, transform: "translateX(-50%)" }}
                >
                  <span className="text-gray-700 font-medium">평단 ${avgEntryPrice.toFixed(2)}</span>
                </div>
              )}

              {/* 목표가들 */}
              {targets.map((target, index) => (
                <div
                  key={index}
                  className="absolute whitespace-nowrap"
                  style={{ left: `${getPosition(target.price)}%`, transform: "translateX(-50%)" }}
                >
                  <span className="text-green-600 font-medium">
                    {targets.length > 1 ? `${index + 1}차` : "목표"} ${target.price.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3열 배치: 손절가 | 현재상태 | 목표가 */}
        <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2 text-sm">
          {/* 왼쪽: 손절가 */}
          <div className="p-2 bg-red-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">손절가</p>
            {stopLoss ? (
              <p className="font-semibold text-red-600">
                ${stopLoss.toFixed(2)}
                <span className="text-xs ml-1">
                  ({getPercent(stopLoss)?.toFixed(1)}%)
                </span>
              </p>
            ) : (
              <p className="text-gray-400">-</p>
            )}
          </div>

          {/* 가운데: 평단가, 보유, 현재가, 손익 */}
          <div className="p-2 bg-gray-50 rounded-lg space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">평단가</span>
              <span className="font-medium">
                ${avgEntryPrice > 0 ? avgEntryPrice.toFixed(2) : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">보유</span>
              <span className="font-medium">
                {currentQuantity > 0 ? `${currentQuantity}주` : "-"}
              </span>
            </div>
            {isOpen && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">현재가</span>
                <span className="font-medium">
                  {currentPrice ? `$${currentPrice.toFixed(2)}` : "-"}
                </span>
              </div>
            )}
          </div>

          {/* 오른쪽: 목표가 */}
          <div className="p-2 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">목표가</p>
            {targets.length > 0 ? (
              <div className="space-y-1">
                {targets.map((target, index) => {
                  const percent = getPercent(target.price);
                  return (
                    <p key={index} className="font-semibold text-green-600 leading-tight">
                      {targets.length > 1 && (
                        <span className="text-xs text-gray-500 mr-0.5">
                          {index + 1}차
                        </span>
                      )}
                      ${target.price.toFixed(2)}
                      <span className="text-xs ml-1">
                        (+{percent?.toFixed(1)}%)
                      </span>
                      {targets.length > 1 && (
                        <span className="text-xs text-gray-400 ml-1">
                          {target.weight}%
                        </span>
                      )}
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400">-</p>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="mt-3 pt-2 border-t flex items-center justify-between text-xs text-gray-500">
          <span>
            {formatDate(trade.startDate)} 시작
            {!isOpen && ` → ${formatDate(trade.endDate)}`}
          </span>
          {trade.mistakeType && (
            <span
              className={`px-2 py-0.5 rounded-full ${
                trade.mistakeType === "원칙준수"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {trade.mistakeType}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
