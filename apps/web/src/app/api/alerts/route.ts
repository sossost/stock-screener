import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { handleApiError, logError } from "@/lib/errors";
import type { ScreenerCompany } from "@/types/screener";
import { ALERT_TYPES } from "@/lib/alerts/constants";
import { parseNumericValue } from "@/lib/screener/query-builder";

// 캐싱 설정: 60초 동안 캐시
export const revalidate = 60;

/**
 * maxDates 파라미터를 안전하게 파싱
 * @param value 쿼리 파라미터 값
 * @param defaultValue 기본값 (기본: 5)
 * @returns 1 이상 100 이하의 정수
 */
function parseMaxDates(value: string | null, defaultValue: number = 5): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 100) {
    return defaultValue;
  }
  return parsed;
}

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

  const alertsData = await db.execute(sql`
    WITH alert_prices AS (
      SELECT DISTINCT ON (symbol)
        symbol,
        adj_close::numeric AS close,
        date::date AS trade_date,
        rs_score
      FROM daily_prices
      WHERE symbol = ANY(ARRAY[${sql.join(
        symbols.map((s) => sql`${s}`),
        sql`, `
      )}])
        AND date = ${date}
    )
    SELECT
      ap.symbol,
      ap.trade_date,
      ap.close AS last_close,
      ap.rs_score,
      s.market_cap,
      s.sector,
      qf.quarterly_data,
      qf.latest_eps,
      qf.revenue_growth_quarters,
      qf.income_growth_quarters,
      qf.revenue_avg_growth_rate,
      qf.income_avg_growth_rate,
      qr.pe_ratio,
      qr.peg_ratio,
      dm.ma20,
      dm.ma50,
      dm.ma100,
      dm.ma200
    FROM alert_prices ap
    LEFT JOIN symbols s ON s.symbol = ap.symbol
    LEFT JOIN LATERAL (
      SELECT
        (
          SELECT json_agg(
            json_build_object(
              'period_end_date', period_end_date,
              'revenue', revenue::numeric,
              'net_income', net_income::numeric,
              'eps_diluted', eps_diluted::numeric
            ) ORDER BY period_end_date DESC
          )
          FROM (
            SELECT period_end_date, revenue, net_income, eps_diluted
            FROM quarterly_financials
            WHERE symbol = ap.symbol
            ORDER BY period_end_date DESC
            LIMIT 8
          ) recent_quarters
        ) as quarterly_data,
        (
          SELECT eps_diluted::numeric
          FROM quarterly_financials
          WHERE symbol = ap.symbol
            AND eps_diluted IS NOT NULL
          ORDER BY period_end_date DESC
          LIMIT 1
        ) as latest_eps,
        (
          WITH revenue_data AS (
            SELECT 
              revenue::numeric as rev, 
              period_end_date,
              ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
            FROM quarterly_financials
            WHERE symbol = ap.symbol
              AND revenue IS NOT NULL
            ORDER BY period_end_date DESC
            LIMIT 8
          ),
          revenue_growth_check AS (
            SELECT 
              rev,
              LAG(rev) OVER (ORDER BY period_end_date ASC) as prev_rev,
              rn,
              CASE WHEN rev > LAG(rev) OVER (ORDER BY period_end_date ASC) THEN 1 ELSE 0 END as is_growth
            FROM revenue_data
          )
          SELECT COALESCE(
            (
              SELECT COUNT(*)
              FROM revenue_growth_check
              WHERE rn >= 1 
                AND is_growth = 1
                AND rn <= COALESCE(
                  (SELECT MIN(rn) FROM revenue_growth_check WHERE rn >= 1 AND is_growth = 0),
                  8
                )
            ), 
            0
          )
        ) as revenue_growth_quarters,
        (
          WITH income_data AS (
            SELECT 
              eps_diluted::numeric as eps, 
              period_end_date,
              ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
            FROM quarterly_financials
            WHERE symbol = ap.symbol
              AND eps_diluted IS NOT NULL
            ORDER BY period_end_date DESC
            LIMIT 8
          ),
          income_growth_check AS (
            SELECT 
              eps,
              LAG(eps) OVER (ORDER BY period_end_date ASC) as prev_eps,
              rn,
              CASE WHEN eps > LAG(eps) OVER (ORDER BY period_end_date ASC) THEN 1 ELSE 0 END as is_growth
            FROM income_data
          )
          SELECT COALESCE(
            (
              SELECT COUNT(*)
              FROM income_growth_check
              WHERE rn >= 1 
                AND is_growth = 1
                AND rn <= COALESCE(
                  (SELECT MIN(rn) FROM income_growth_check WHERE rn >= 1 AND is_growth = 0),
                  8
                )
            ), 
            0
          )
        ) as income_growth_quarters,
        (
          WITH revenue_data AS (
            SELECT 
              revenue::numeric as rev, 
              period_end_date,
              ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
            FROM quarterly_financials
            WHERE symbol = ap.symbol
              AND revenue IS NOT NULL
            ORDER BY period_end_date DESC
            LIMIT 8
          ),
          revenue_growth_rates AS (
            SELECT 
              rev,
              LAG(rev) OVER (ORDER BY period_end_date ASC) as prev_rev,
              CASE 
                WHEN LAG(rev) OVER (ORDER BY period_end_date ASC) = 0 THEN NULL
                WHEN LAG(rev) OVER (ORDER BY period_end_date ASC) IS NULL THEN NULL
                ELSE ((rev - LAG(rev) OVER (ORDER BY period_end_date ASC)) / 
                      NULLIF(LAG(rev) OVER (ORDER BY period_end_date ASC), 0)) * 100
              END as growth_rate
            FROM revenue_data
          )
          SELECT AVG(growth_rate)::numeric as avg_growth_rate
          FROM revenue_growth_rates
          WHERE growth_rate IS NOT NULL
        ) as revenue_avg_growth_rate,
        (
          WITH income_data AS (
            SELECT 
              eps_diluted::numeric as eps, 
              period_end_date,
              ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
            FROM quarterly_financials
            WHERE symbol = ap.symbol
              AND eps_diluted IS NOT NULL
            ORDER BY period_end_date DESC
            LIMIT 8
          ),
          income_growth_rates AS (
            SELECT 
              eps,
              LAG(eps) OVER (ORDER BY period_end_date ASC) as prev_eps,
              CASE 
                WHEN LAG(eps) OVER (ORDER BY period_end_date ASC) = 0 THEN NULL
                WHEN LAG(eps) OVER (ORDER BY period_end_date ASC) IS NULL THEN NULL
                ELSE ((eps - LAG(eps) OVER (ORDER BY period_end_date ASC)) / 
                      NULLIF(LAG(eps) OVER (ORDER BY period_end_date ASC), 0)) * 100
              END as growth_rate
            FROM income_data
          )
          SELECT AVG(growth_rate)::numeric as avg_growth_rate
          FROM income_growth_rates
          WHERE growth_rate IS NOT NULL
        ) as income_avg_growth_rate
    ) qf ON true
    LEFT JOIN LATERAL (
      SELECT
        pe_ratio,
        peg_ratio
      FROM quarterly_ratios
      WHERE symbol = ap.symbol
      ORDER BY period_end_date DESC
      LIMIT 1
    ) qr ON true
    LEFT JOIN daily_ma dm ON dm.symbol = ap.symbol AND dm.date = ${date}
  `);

  interface QueryResult {
    symbol: string;
    trade_date: string;
    last_close: number;
    rs_score: number | null;
    market_cap: number | null;
    sector: string | null;
    quarterly_data: unknown;
    latest_eps: number | null;
    revenue_growth_quarters: number | null;
    income_growth_quarters: number | null;
    revenue_avg_growth_rate: number | null;
    income_avg_growth_rate: number | null;
    pe_ratio: number | string | null;
    peg_ratio: number | string | null;
    ma20: number | null;
    ma50: number | null;
    ma100: number | null;
    ma200: number | null;
    [key: string]: unknown;
  }

  /**
   * QueryResult 타입 가드
   * Drizzle의 반환 타입이 명시적이지 않아 타입 단언이 필요하지만,
   * 런타임 검증을 통해 안전성 확보
   */
  function isQueryResult(row: unknown): row is QueryResult {
    return (
      typeof row === "object" &&
      row !== null &&
      "symbol" in row &&
      "trade_date" in row &&
      "last_close" in row
    );
  }

  const results = alertsData.rows.filter(isQueryResult);

  return results.map((r) => {
    // 정배열 여부 계산
    const ordered =
      r.ma20 !== null &&
      r.ma50 !== null &&
      r.ma100 !== null &&
      r.ma200 !== null &&
      r.ma20 > r.ma50 &&
      r.ma50 > r.ma100 &&
      r.ma100 > r.ma200;

    return {
      symbol: r.symbol,
      market_cap: r.market_cap?.toString() || null,
      sector: r.sector ?? null,
      last_close: r.last_close?.toString() || "0",
      quarterly_financials:
        (r.quarterly_data as Array<{
          period_end_date: string;
          revenue: number | null;
          net_income: number | null;
          eps_diluted: number | null;
        }>) || [],
      profitability_status:
        r.latest_eps !== null && r.latest_eps > 0
          ? "profitable"
          : r.latest_eps !== null && r.latest_eps < 0
            ? "unprofitable"
            : "unknown",
      revenue_growth_quarters: r.revenue_growth_quarters || 0,
      income_growth_quarters: r.income_growth_quarters || 0,
      revenue_avg_growth_rate: r.revenue_avg_growth_rate,
      income_avg_growth_rate: r.income_avg_growth_rate,
      ordered: ordered ?? false,
      just_turned: false,
      rs_score:
        r.rs_score === null || r.rs_score === undefined
          ? null
          : Number(r.rs_score),
      pe_ratio: parseNumericValue(r.pe_ratio),
      peg_ratio: parseNumericValue(r.peg_ratio),
    } satisfies ScreenerCompany;
  });
}

/**
 * GET: 알림 목록 조회
 * 최신 날짜부터 5거래일치의 알림을 날짜별로 그룹화하여 반환
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertType =
      searchParams.get("alertType") || ALERT_TYPES.MA20_BREAKOUT_ORDERED;
    const maxDates = parseMaxDates(searchParams.get("maxDates"), 5);

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
