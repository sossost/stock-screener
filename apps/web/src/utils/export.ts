import { TradeListItem, TradeStatus } from "@/lib/trades/types";
import { formatDateKr } from "./format";

/**
 * CSV 값 이스케이프 처리
 * 쉼표, 따옴표, 줄바꿈이 포함된 값을 CSV 형식에 맞게 이스케이프
 */
function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // 쉼표, 따옴표, 줄바꿈이 포함된 경우 이스케이프 처리
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    // 내부 따옴표는 두 개로 변환하고 전체를 따옴표로 감싸기
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTradesToCsv(
  trades: TradeListItem[],
  status: TradeStatus
): void {
  try {
    if (!trades || trades.length === 0) {
      throw new Error("No trades to export");
    }

    const headers =
      status === "OPEN"
        ? [
            "Symbol",
            "Strategy",
            "Entry Price",
            "Stop Loss",
            "Target Price",
            "Quantity",
            "Start Date",
          ]
        : [
            "Symbol",
            "Strategy",
            "Entry Price",
            "Exit Price",
            "Quantity",
            "PnL",
            "ROI",
            "R-Multiple",
            "Start Date",
            "End Date",
            "Review",
          ];

    const rows = trades.map((t) => {
      if (status === "OPEN") {
        return [
          escapeCsvValue(t.symbol),
          escapeCsvValue(t.strategy),
          t.calculated.avgEntryPrice.toFixed(2),
          escapeCsvValue(t.planStopLoss),
          escapeCsvValue(t.planTargetPrice),
          t.calculated.currentQuantity,
          t.startDate ? escapeCsvValue(formatDateKr(t.startDate)) : "",
        ];
      }
      return [
        escapeCsvValue(t.symbol),
        escapeCsvValue(t.strategy),
        t.calculated.avgEntryPrice.toFixed(2),
        t.calculated.avgExitPrice?.toFixed(2) || "",
        t.calculated.totalBuyQuantity,
        escapeCsvValue(t.finalPnl),
        t.finalRoi != null
          ? escapeCsvValue((parseFloat(t.finalRoi) * 100).toFixed(2) + "%")
          : "",
        escapeCsvValue(t.finalRMultiple),
        t.startDate ? escapeCsvValue(formatDateKr(t.startDate)) : "",
        t.endDate ? escapeCsvValue(formatDateKr(t.endDate)) : "",
        escapeCsvValue(t.mistakeType),
      ];
    });

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8",
    });

    if (!blob || blob.size === 0) {
      throw new Error("Failed to create CSV blob");
    }

    const url = URL.createObjectURL(blob);
    if (!url) {
      throw new Error("Failed to create object URL");
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = `trades-${status.toLowerCase()}-${formatDateKr(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export CSV:", error);
    // TODO: 사용자에게 에러 메시지 표시 (토스트 등)
    throw error;
  }
}

