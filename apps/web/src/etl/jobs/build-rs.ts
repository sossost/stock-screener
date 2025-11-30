// src/etl/jobs/build-rs.ts
import "dotenv/config";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { validateDatabaseOnlyEnvironment } from "../utils/validation";

const BACKFILL_DAYS = 365; // 최근 1년 기준일만 백필
const LOOKBACK_12M = 252;
const LOOKBACK_6M = 126;
const LOOKBACK_3M = 63;

// 가중치: 최근 모멘텀을 더 반영
const WEIGHT_12M = 0.4;
const WEIGHT_6M = 0.35;
const WEIGHT_3M = 0.25;

async function computeRsForDate(targetDate: string) {
  console.log(`📊 Computing RS for ${targetDate}...`);

  try {
    const result = await db.execute(sql`
      WITH target AS (
        SELECT ${targetDate}::date AS d
      ),
      latest AS (
        SELECT
          dp.symbol,
          dp.adj_close::numeric AS last_close,
          (
            SELECT dp2.adj_close::numeric
            FROM daily_prices dp2
            JOIN target t2 ON dp2.date::date <= t2.d
            WHERE dp2.symbol = dp.symbol
            ORDER BY dp2.date DESC
            OFFSET ${LOOKBACK_12M}
            LIMIT 1
          ) AS lag_12m,
          (
            SELECT dp2.adj_close::numeric
            FROM daily_prices dp2
            JOIN target t2 ON dp2.date::date <= t2.d
            WHERE dp2.symbol = dp.symbol
            ORDER BY dp2.date DESC
            OFFSET ${LOOKBACK_6M}
            LIMIT 1
          ) AS lag_6m,
          (
            SELECT dp2.adj_close::numeric
            FROM daily_prices dp2
            JOIN target t2 ON dp2.date::date <= t2.d
            WHERE dp2.symbol = dp.symbol
            ORDER BY dp2.date DESC
            OFFSET ${LOOKBACK_3M}
            LIMIT 1
          ) AS lag_3m
        FROM daily_prices dp
        JOIN target t ON dp.date::date = t.d
      ),
      returns AS (
        SELECT
          symbol,
          CASE WHEN lag_12m IS NULL OR lag_12m = 0 THEN NULL ELSE (last_close / lag_12m) - 1 END AS ret_12m,
          CASE WHEN lag_6m IS NULL OR lag_6m = 0 THEN NULL ELSE (last_close / lag_6m) - 1 END AS ret_6m,
          CASE WHEN lag_3m IS NULL OR lag_3m = 0 THEN NULL ELSE (last_close / lag_3m) - 1 END AS ret_3m
        FROM latest
      ),
      r12 AS (
        SELECT symbol, percent_rank() OVER (ORDER BY ret_12m) AS pr12
        FROM returns
        WHERE ret_12m IS NOT NULL
      ),
      r6 AS (
        SELECT symbol, percent_rank() OVER (ORDER BY ret_6m) AS pr6
        FROM returns
        WHERE ret_6m IS NOT NULL
      ),
      r3 AS (
        SELECT symbol, percent_rank() OVER (ORDER BY ret_3m) AS pr3
        FROM returns
        WHERE ret_3m IS NOT NULL
      ),
      combined AS (
        SELECT
          rt.symbol,
          CASE
            WHEN r12.pr12 IS NULL OR r6.pr6 IS NULL OR r3.pr3 IS NULL THEN NULL
            ELSE ROUND((r12.pr12 * ${WEIGHT_12M} + r6.pr6 * ${WEIGHT_6M} + r3.pr3 * ${WEIGHT_3M}) * 100)::int
          END AS rs_score
        FROM returns rt
        LEFT JOIN r12 ON r12.symbol = rt.symbol
        LEFT JOIN r6 ON r6.symbol = rt.symbol
        LEFT JOIN r3 ON r3.symbol = rt.symbol
      ),
      updated AS (
        UPDATE daily_prices dp
        SET rs_score = c.rs_score
        FROM combined c
        JOIN target t ON true
        WHERE dp.symbol = c.symbol
          AND dp.date::date = t.d
        RETURNING dp.symbol, dp.rs_score
      )
      SELECT COUNT(*) AS updated_count FROM updated;
    `) as { rows: { updated_count: number }[] };

    const updatedCount = result.rows?.[0]?.updated_count ?? 0;
    console.log(
      `✅ RS computed for ${targetDate} (rows updated: ${updatedCount})`
    );
  } catch (e: any) {
    console.error(`❌ Failed to compute RS for ${targetDate}:`, e?.message ?? e);
    throw e;
  }
}

async function main() {
  console.log("🚀 Starting RS build...");

  // RS ETL은 외부 API를 사용하지 않으므로 DATABASE_URL만 검증
  const envValidation = validateDatabaseOnlyEnvironment();
  if (!envValidation.isValid) {
    console.error("❌ Environment validation failed:", envValidation.errors);
    process.exit(1);
  }

  const isBackfill = process.argv.slice(2).includes("backfill");

  // 대상 날짜 수집
  const dateRows = isBackfill
    ? await db.execute(sql`
        SELECT DISTINCT date::date AS d
        FROM daily_prices
        ORDER BY d DESC
        LIMIT ${BACKFILL_DAYS};
      `)
    : await db.execute(sql`
        SELECT MAX(date)::date AS d
        FROM daily_prices;
      `);

  const dates: string[] = (dateRows.rows as any[])
    .map((r) => r.d || r.date || r.max)
    .filter(Boolean);

  if (!dates.length) {
    console.warn("⚠️ No dates found in daily_prices; aborting.");
    return;
  }

  // 순차 실행 (날짜 수가 많지 않으므로 직렬 처리)
  for (const d of dates) {
    try {
      await computeRsForDate(d);
    } catch (e: any) {
      console.error(`❌ Failed to compute RS for ${d}:`, e?.message ?? e);
    }
  }

  console.log("✅ RS build finished.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("❌ RS build failed:", err);
    process.exit(1);
  });
}
