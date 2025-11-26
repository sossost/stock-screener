import { NextRequest, NextResponse } from "next/server";
import { getStockDetail } from "@/lib/stock-detail";
import type { StockDetailResponse } from "@/types/stock-detail";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
): Promise<NextResponse<StockDetailResponse>> {
  try {
    const { symbol } = await params;
    const data = await getStockDetail(symbol);

    if (!data) {
      return NextResponse.json(
        { data: null, error: "종목을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Stock detail API error:", error);
    return NextResponse.json(
      { data: null, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
