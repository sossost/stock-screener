import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { portfolio } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getOrCreateSessionId, createSessionCookie } from "@/lib/session";
import { handleApiError } from "@/lib/errors";
import type { AddPortfolioRequest, PortfolioResponse } from "@/types/portfolio";
import type { ScreenerCompany } from "@/types/screener";

// 캐싱 설정: 60초 동안 캐시
export const revalidate = 60;

/**
 * GET: 세션별 포트폴리오 종목 목록 조회
 * 쿼리 파라미터: includeData=true 시 재무 데이터도 함께 반환
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = getOrCreateSessionId(request);
    const { searchParams } = new URL(request.url);
    const includeData = searchParams.get("includeData") === "true";

    // 데이터베이스에서 해당 세션의 포트폴리오 조회
    const items = await db
      .select({
        symbol: portfolio.symbol,
      })
      .from(portfolio)
      .where(eq(portfolio.sessionId, sessionId))
      .orderBy(portfolio.addedAt);

    const symbols = items.map((item) => item.symbol);

    const responseData: PortfolioResponse = {
      symbols,
    };

    // 재무 데이터가 필요한 경우
    if (includeData && symbols.length > 0) {
      // 포트폴리오 심볼들에 대한 재무 데이터 조회 (최적화된 쿼리)
      const portfolioData = await db.execute(sql`
        WITH last_d AS (
          SELECT MAX(date)::date AS d
          FROM daily_prices
        ),
        latest_prices AS (
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
            AND date::date = (SELECT d FROM last_d)
        )
        SELECT
          lp.symbol,
          lp.trade_date,
          lp.close AS last_close,
          lp.rs_score,
          s.market_cap,
          s.sector,
          qf.quarterly_data,
          qf.latest_eps,
          qf.revenue_growth_quarters,
          qf.income_growth_quarters,
          qf.revenue_avg_growth_rate,
          qf.income_avg_growth_rate,
          qr.pe_ratio,
          qr.peg_ratio
        FROM latest_prices lp
        LEFT JOIN symbols s ON s.symbol = lp.symbol
        LEFT JOIN LATERAL (
          SELECT
            (
              SELECT json_agg(
                json_build_object(
                  'period_end_date', period_end_date,
                  'revenue', revenue::numeric,
                  'eps_diluted', eps_diluted::numeric
                ) ORDER BY period_end_date DESC
              )
              FROM (
                SELECT period_end_date, revenue, eps_diluted
                FROM quarterly_financials
                WHERE symbol = lp.symbol
                ORDER BY period_end_date DESC
                LIMIT 8
              ) recent_quarters
            ) as quarterly_data,
            (
              SELECT eps_diluted::numeric
              FROM quarterly_financials
              WHERE symbol = lp.symbol
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
                WHERE symbol = lp.symbol
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
                WHERE symbol = lp.symbol
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
                WHERE symbol = lp.symbol
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
                WHERE symbol = lp.symbol
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
          FROM quarterly_financials
          WHERE symbol = lp.symbol
          GROUP BY lp.symbol
        ) qf ON true
        LEFT JOIN LATERAL (
          SELECT
            pe_ratio,
            peg_ratio
          FROM quarterly_ratios
          WHERE symbol = lp.symbol
          ORDER BY period_end_date DESC
          LIMIT 1
        ) qr ON true
      `);

      // 데이터 변환 (골든크로스 API와 동일한 형식)
      const tradeDate =
        portfolioData.rows.length > 0
          ? (portfolioData.rows[0] as any).trade_date
          : null;

      const parseRatio = (val: any): number | null => {
        if (val === null || val === undefined || val === "") return null;
        const str = String(val).trim();
        if (str === "" || str === "null" || str === "undefined") return null;
        const num = parseFloat(str);
        return isNaN(num) || !isFinite(num) ? null : num;
      };

      const data: ScreenerCompany[] = portfolioData.rows.map((r: any) => ({
        symbol: r.symbol,
        market_cap: r.market_cap?.toString() || null,
        sector: r.sector ?? null,
        last_close: r.last_close?.toString() || "0",
        quarterly_financials: r.quarterly_data || [],
        profitability_status: (
          r.latest_eps !== null && r.latest_eps > 0
            ? "profitable"
            : r.latest_eps !== null && r.latest_eps < 0
            ? "unprofitable"
            : "unknown"
        ) as "profitable" | "unprofitable" | "unknown",
        revenue_growth_quarters: r.revenue_growth_quarters || 0,
        income_growth_quarters: r.income_growth_quarters || 0,
        revenue_avg_growth_rate: r.revenue_avg_growth_rate,
        income_avg_growth_rate: r.income_avg_growth_rate,
        ordered: true,
        just_turned: false,
        rs_score:
          r.rs_score === null || r.rs_score === undefined
            ? null
            : Number(r.rs_score),
        pe_ratio: parseRatio(r.pe_ratio),
        peg_ratio: parseRatio(r.peg_ratio),
      }));

      responseData.data = data;
      responseData.trade_date = tradeDate;
    }

    const response = NextResponse.json<PortfolioResponse>(responseData);

    // 캐싱 헤더 추가
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=120"
    );

    // 세션 ID가 없었던 경우 쿠키 설정
    if (!request.cookies.get("portfolio_session_id")) {
      response.headers.set("Set-Cookie", createSessionCookie(sessionId));
    }

    return response;
  } catch (error) {
    const apiError = handleApiError(error);
    return NextResponse.json(
      {
        error: apiError.message,
        details: apiError.details,
      },
      { status: apiError.statusCode }
    );
  }
}

/**
 * POST: 포트폴리오에 종목 추가
 */
export async function POST(request: NextRequest) {
  let body: AddPortfolioRequest | null = null;
  try {
    const sessionId = getOrCreateSessionId(request);
    body = await request.json();

    if (!body || !body.symbol || typeof body.symbol !== "string") {
      return NextResponse.json(
        { error: "Invalid request: symbol is required" },
        { status: 400 }
      );
    }

    // 중복 확인
    const existing = await db
      .select()
      .from(portfolio)
      .where(
        and(
          eq(portfolio.sessionId, sessionId),
          eq(portfolio.symbol, body.symbol)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 이미 존재하는 경우 200 반환
      const response = NextResponse.json(
        { message: "Symbol already in portfolio", symbol: body.symbol },
        { status: 200 }
      );

      if (!request.cookies.get("portfolio_session_id")) {
        response.headers.set("Set-Cookie", createSessionCookie(sessionId));
      }

      return response;
    }

    // 포트폴리오에 추가
    await db.insert(portfolio).values({
      sessionId,
      symbol: body.symbol,
    });

    const response = NextResponse.json(
      { message: "Symbol added to portfolio", symbol: body.symbol },
      { status: 201 }
    );

    if (!request.cookies.get("portfolio_session_id")) {
      response.headers.set("Set-Cookie", createSessionCookie(sessionId));
    }

    return response;
  } catch (error) {
    // Unique 제약조건 위반 시 중복으로 처리
    if (
      error instanceof Error &&
      (error.message.includes("uq_portfolio_session_symbol") ||
        error.message.includes("duplicate key")) &&
      body
    ) {
      const sessionId = getOrCreateSessionId(request);
      const response = NextResponse.json(
        { message: "Symbol already in portfolio", symbol: body.symbol },
        { status: 200 }
      );

      if (!request.cookies.get("portfolio_session_id")) {
        response.headers.set("Set-Cookie", createSessionCookie(sessionId));
      }

      return response;
    }

    const apiError = handleApiError(error);
    return NextResponse.json(
      {
        error: apiError.message,
        details: apiError.details,
      },
      { status: apiError.statusCode }
    );
  }
}

/**
 * DELETE: 포트폴리오에서 종목 제거
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = getOrCreateSessionId(request);
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { error: "Invalid request: symbol parameter is required" },
        { status: 400 }
      );
    }

    // 해당 세션의 종목만 삭제 가능 (보안)
    const result = await db
      .delete(portfolio)
      .where(
        and(eq(portfolio.sessionId, sessionId), eq(portfolio.symbol, symbol))
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Symbol not found in portfolio" },
        { status: 404 }
      );
    }

    const response = NextResponse.json(
      { message: "Symbol removed from portfolio", symbol },
      { status: 200 }
    );

    if (!request.cookies.get("portfolio_session_id")) {
      response.headers.set("Set-Cookie", createSessionCookie(sessionId));
    }

    return response;
  } catch (error) {
    const apiError = handleApiError(error);
    return NextResponse.json(
      {
        error: apiError.message,
        details: apiError.details,
      },
      { status: apiError.statusCode }
    );
  }
}
