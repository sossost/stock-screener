import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { handleApiError, logError } from "@/lib/errors";
import { alertsQuerySchema } from "@/lib/alerts/validators";
import { buildAlertsQuery } from "@/lib/alerts/queries";
import {
  isQueryResult,
  transformToScreenerCompany,
} from "@/lib/alerts/transformers";
import type { ScreenerCompany } from "@/types/screener";

// 캐싱 설정: 60초 동안 캐시
export const revalidate = 60;

/**
 * DateRow 타입 가드
 */
function isDateRow(row: unknown): row is { alert_date: string } {
  return (
    typeof row === "object" &&
    row !== null &&
    "alert_date" in row &&
    typeof (row as { alert_date: unknown }).alert_date === "string"
  );
}

/**
 * SymbolRow 타입 가드
 */
function isSymbolRow(row: unknown): row is { symbol: string } {
  return (
    typeof row === "object" &&
    row !== null &&
    "symbol" in row &&
    typeof (row as { symbol: unknown }).symbol === "string"
  );
}

interface AlertsByDate {
  date: string;
  alertType: string;
  alerts: ScreenerCompany[];
}

interface AlertsResponse {
  alertsByDate: AlertsByDate[];
  totalDates: number;
  alertType: string;
}

/**
 * 해당 날짜의 알림 종목들을 ScreenerCompany 형태로 변환
 */
async function getAlertsForDate(
  date: string,
  symbols: string[]
): Promise<ScreenerCompany[]> {
  if (symbols.length === 0) {
    return [];
  }

  const query = buildAlertsQuery(date, symbols);
  const alertsData = await db.execute(query);
  const results = alertsData.rows.filter(isQueryResult);

  return results.map(transformToScreenerCompany);
}

/**
 * GET: 알림 목록 조회
 * 최신 날짜부터 5거래일치의 알림을 날짜별로 그룹화하여 반환
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // zod 스키마로 파라미터 검증
    const validated = alertsQuerySchema.safeParse({
      alertType: searchParams.get("alertType"),
      maxDates: searchParams.get("maxDates"),
    });

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validated.error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`
          ),
        },
        { status: 400 }
      );
    }

    const { alertType, maxDates } = validated.data;

    // 최신 날짜부터 maxDates개의 날짜 조회
    const datesResult = await db.execute(sql`
      SELECT DISTINCT alert_date
      FROM price_alerts
      WHERE alert_type = ${alertType}
      ORDER BY alert_date DESC
      LIMIT ${maxDates}
    `);

    const dates = datesResult.rows.filter(isDateRow).map((r) => r.alert_date);

    if (dates.length === 0) {
      return NextResponse.json<AlertsResponse>({
        alertsByDate: [],
        totalDates: 0,
        alertType,
      });
    }

    // 전체 알림이 있는 날짜 수 조회
    const totalDatesResult = await db.execute(sql`
      SELECT COUNT(DISTINCT alert_date) as count
      FROM price_alerts
      WHERE alert_type = ${alertType}
    `);

    const totalDates =
      (totalDatesResult.rows[0] as { count: string | number })?.count || 0;
    const totalDatesNumber =
      typeof totalDates === "string" ? parseInt(totalDates, 10) : totalDates;

    // 각 날짜별로 알림 종목 조회
    const alertsByDate: AlertsByDate[] = [];

    for (const date of dates) {
      // 해당 날짜의 알림 종목 심볼 조회
      const symbolsResult = await db.execute(sql`
        SELECT symbol
        FROM price_alerts
        WHERE alert_type = ${alertType}
          AND alert_date = ${date}
        ORDER BY symbol
      `);

      const symbols = symbolsResult.rows
        .filter(isSymbolRow)
        .map((r) => r.symbol);

      if (symbols.length > 0) {
        const alerts = await getAlertsForDate(date, symbols);
        alertsByDate.push({
          date,
          alertType,
          alerts,
        });
      }
    }

    const response = NextResponse.json<AlertsResponse>({
      alertsByDate,
      totalDates: totalDatesNumber,
      alertType,
    });

    // 캐싱 헤더 추가
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=120"
    );

    return response;
  } catch (error) {
    console.error("[Alerts API] Full error:", error);
    if (error instanceof Error) {
      console.error("[Alerts API] Error message:", error.message);
      console.error("[Alerts API] Error stack:", error.stack);
    }
    logError(error, "Alerts API");
    const apiError = handleApiError(error);

    return NextResponse.json(
      {
        error: apiError.message,
        details: apiError.details,
        ...(process.env.NODE_ENV === "development" && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: apiError.statusCode }
    );
  }
}
