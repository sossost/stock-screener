import { sql, SQL } from "drizzle-orm";
import { db } from "@/db/client";

/**
 * 알림 종목 데이터 조회 쿼리 빌더
 */
export function buildAlertsQuery(date: string, symbols: string[]): SQL {
  return sql`
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
  `;
}

