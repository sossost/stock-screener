import { TradeListItem, TradeStatus } from "@/lib/trades/types";
import { formatDateKr } from "./format";

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
          t.symbol,
          t.strategy || "",
          t.calculated.avgEntryPrice.toFixed(2),
          t.planStopLoss || "",
          t.planTargetPrice || "",
          t.calculated.currentQuantity,
          t.startDate ? formatDateKr(t.startDate) : "",
        ];
      }
      return [
        t.symbol,
        t.strategy || "",
        t.calculated.avgEntryPrice.toFixed(2),
        t.calculated.avgExitPrice?.toFixed(2) || "",
        t.calculated.totalBuyQuantity,
        t.finalPnl || "",
        t.finalRoi ? (parseFloat(t.finalRoi) * 100).toFixed(2) + "%" : "",
        t.finalRMultiple || "",
        t.startDate ? formatDateKr(t.startDate) : "",
        t.endDate ? formatDateKr(t.endDate) : "",
        t.mistakeType || "",
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

