import React from "react";
import { db } from "@/db/client";
import { watchlist } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { WatchlistTableClient } from "@/components/watchlist/WatchlistTableClient";
import type { ScreenerCompany } from "@/types/screener";
import { getUserIdFromCookies } from "@/lib/auth/user";

async function fetchWatchlistData() {
  const userId = await getUserIdFromCookies();

  if (!userId) {
    return { symbols: [], data: [], tradeDate: null };
  }

  const items = await db
    .select({ symbol: watchlist.symbol })
    .from(watchlist)
    .where(eq(watchlist.userId, userId))
    .orderBy(watchlist.addedAt);

  const symbols = items.map((item) => item.symbol);

  if (symbols.length === 0) {
    return { symbols: [], data: [], tradeDate: null };
  }

  const watchlistData = await db.execute(sql`
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

  type QueryResult = {
    symbol: string;
    trade_date: string;
    last_close: number;
    market_cap: number | null;
    sector: string | null;
    rs_score: number | null;
    quarterly_data: any[] | null;
    latest_eps: number | null;
    revenue_growth_quarters: number | null;
    income_growth_quarters: number | null;
    revenue_avg_growth_rate: number | null;
    income_avg_growth_rate: number | null;
    pe_ratio: number | string | null;
    peg_ratio: number | string | null;
  };

  const results = watchlistData.rows as QueryResult[];
  const tradeDate = results.length > 0 ? results[0].trade_date : null;

  const data: ScreenerCompany[] = results.map((r) => ({
    symbol: r.symbol,
    market_cap: r.market_cap?.toString() || null,
    sector: r.sector ?? null,
    last_close: r.last_close.toString(),
    rs_score:
      r.rs_score === null || r.rs_score === undefined ? null : Number(r.rs_score),
    quarterly_financials: r.quarterly_data || [],
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
    ordered: true,
    just_turned: false,
    pe_ratio: (() => {
      const val = r.pe_ratio;
      if (val === null || val === undefined || val === "") return null;
      const str = String(val).trim();
      if (str === "" || str === "null" || str === "undefined") return null;
      const num = parseFloat(str);
      return isNaN(num) || !isFinite(num) ? null : num;
    })(),
    peg_ratio: (() => {
      const val = r.peg_ratio;
      if (val === null || val === undefined || val === "") return null;
      const str = String(val).trim();
      if (str === "" || str === "null" || str === "undefined") return null;
      const num = parseFloat(str);
      return isNaN(num) || !isFinite(num) ? null : num;
    })(),
  }));

  return { symbols, data, tradeDate };
}

export async function WatchlistDataWrapper() {
  const { symbols, data, tradeDate } = await fetchWatchlistData();

  return (
    <WatchlistTableClient symbols={symbols} data={data} tradeDate={tradeDate} />
  );
}


