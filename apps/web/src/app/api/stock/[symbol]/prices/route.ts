import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { dailyPrices } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

// 기간별 일수 매핑
const PERIOD_DAYS: Record<string, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "2Y": 730,
  "5Y": 1825,
};

interface PriceDataRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 심볼 형식 검증 (1-5자 영문 대문자)
const SYMBOL_REGEX = /^[A-Z]{1,5}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase().trim();

    // 심볼 유효성 검증
    if (!upperSymbol || !SYMBOL_REGEX.test(upperSymbol)) {
      return NextResponse.json(
        { error: "Invalid symbol format" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "1Y";

    const days = PERIOD_DAYS[period] || 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().slice(0, 10);

    // dailyPrices 조회 (MA는 클라이언트에서 계산)
    const priceData = await db
      .select({
        date: dailyPrices.date,
        open: dailyPrices.open,
        high: dailyPrices.high,
        low: dailyPrices.low,
        close: dailyPrices.close,
        volume: dailyPrices.volume,
      })
      .from(dailyPrices)
      .where(
        and(
          eq(dailyPrices.symbol, upperSymbol),
          gte(dailyPrices.date, startDateStr)
        )
      )
      .orderBy(dailyPrices.date);

    if (priceData.length === 0) {
      return NextResponse.json(
        { error: "No price data found" },
        { status: 404 }
      );
    }

    // 데이터 변환 (문자열 -> 숫자)
    const formattedData: PriceDataRow[] = priceData.map((row) => ({
      date: row.date,
      open: Number(row.open) || 0,
      high: Number(row.high) || 0,
      low: Number(row.low) || 0,
      close: Number(row.close) || 0,
      volume: Number(row.volume) || 0,
    }));

    return NextResponse.json({
      symbol: upperSymbol,
      period,
      count: formattedData.length,
      data: formattedData,
    });
  } catch (error) {
    console.error("[Prices API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch price data" },
      { status: 500 }
    );
  }
}
