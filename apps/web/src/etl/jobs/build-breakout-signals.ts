// src/etl/jobs/build-breakout-signals.ts
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { dailyBreakoutSignals } from "@/db/schema";
import {
  getLatestTradeDate,
  getPreviousTradeDate,
} from "../utils/date-helpers";
import { validateDatabaseOnlyEnvironment } from "../utils/validation";

/**
 * 어제 기준 돌파/재테스트 신호를 계산하여 daily_breakout_signals 테이블에 저장
 * - 확정 돌파(confirmed breakout)
 * - 완벽한 재테스트(perfect retest)
 */
export async function buildBreakoutSignals() {
  console.log("🚀 Building daily breakout signals...");

  const envValidation = validateDatabaseOnlyEnvironment();
  if (!envValidation.isValid) {
    console.error("❌ Environment validation failed:", envValidation.errors);
    process.exit(1);
  }

  try {
    const latestDate = await getLatestTradeDate();
    if (!latestDate) {
      console.warn("⚠️ No latest trade date found");
      return;
    }

    const previousDate = await getPreviousTradeDate(latestDate);
    if (!previousDate) {
      console.warn("⚠️ No previous trade date found");
      return;
    }

    console.log(
      `📅 latest date: ${latestDate}, previous date: ${previousDate}`
    );

    // 확정 돌파 및 완벽 재테스트를 하나의 쿼리로 계산
    const result = await db.execute(sql`
      WITH last_trade_date AS (
        SELECT MAX(date::date)::date AS d FROM daily_prices
      ),
      yesterday_trade_date AS (
        SELECT MAX(date::date)::date AS d
        FROM daily_prices
        WHERE date::date < (SELECT d FROM last_trade_date)
      ),
      -- 어제 캔들 + MA 데이터
      yesterday_data AS (
        SELECT
          dp.symbol,
          dp.close,
          dp.open,
          dp.low,
          dp.high,
          dp.volume,
          dm.ma20,
          dm.ma50,
          dm.ma200
        FROM daily_prices dp
        JOIN daily_ma dm ON dp.symbol = dm.symbol AND dp.date::date = dm.date::date
        WHERE dp.date::date = (SELECT d FROM yesterday_trade_date)
          AND (SELECT d FROM yesterday_trade_date) IS NOT NULL
          AND dp.close IS NOT NULL
          AND dp.open IS NOT NULL
          AND dp.low IS NOT NULL
          AND dp.high IS NOT NULL
          AND dp.volume IS NOT NULL
          AND dp.volume > 0
          AND dm.ma20 IS NOT NULL
          AND dm.ma50 IS NOT NULL
          AND dm.ma200 IS NOT NULL
          AND dm.ma20 > 0
          AND dm.ma50 > 0
          AND dm.ma200 > 0
      ),
      -- 확정 돌파 계산용: 20일 고점/평균 거래량
      yesterday_with_windows AS (
        SELECT
          dp.symbol,
          dp.close,
          dp.high,
          dp.low,
          dp.volume,
          MAX(dp.high) OVER (
            PARTITION BY dp.symbol 
            ORDER BY dp.date::date 
            ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
          ) AS high_20d,
          AVG(dp.volume) OVER (
            PARTITION BY dp.symbol 
            ORDER BY dp.date::date 
            ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
          ) AS avg_volume_20d
        FROM daily_prices dp
        WHERE dp.date::date = (SELECT d FROM yesterday_trade_date)
          AND (SELECT d FROM yesterday_trade_date) IS NOT NULL
          AND dp.close IS NOT NULL
          AND dp.high IS NOT NULL
          AND dp.low IS NOT NULL
          AND dp.volume IS NOT NULL
          AND dp.volume > 0
      ),
      confirmed_breakout AS (
        SELECT 
          y.symbol,
          TRUE AS is_confirmed_breakout,
          (y.close / y.high_20d - 1) * 100 AS breakout_percent,
          (y.volume / y.avg_volume_20d) AS volume_ratio
        FROM yesterday_with_windows y
        WHERE 
          y.high_20d IS NOT NULL
          AND y.avg_volume_20d IS NOT NULL
          AND y.avg_volume_20d > 0
          AND y.close >= y.high_20d
          AND y.volume >= (y.avg_volume_20d * 2.0)
          AND (y.high - y.low) > 0
          AND (y.high - y.close) < ((y.high - y.low) * 0.2)
      ),
      -- 과거 3~10일 신고가 돌파 이력
      past_breakouts_retest AS (
        SELECT DISTINCT dp.symbol
        FROM daily_prices dp
        WHERE (SELECT d FROM last_trade_date) IS NOT NULL
          AND dp.date::date BETWEEN 
            ((SELECT d FROM last_trade_date) - INTERVAL '10 days')::date AND
            ((SELECT d FROM last_trade_date) - INTERVAL '3 days')::date
          AND dp.close IS NOT NULL
          AND dp.high IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM daily_prices dp2
            WHERE dp2.symbol = dp.symbol
              AND dp2.date::date <= dp.date::date
              AND dp2.date::date >= (dp.date::date - INTERVAL '19 days')::date
              AND dp2.high IS NOT NULL
            HAVING dp.close >= MAX(dp2.high)
          )
      ),
      perfect_retest AS (
        SELECT 
          yd.symbol,
          TRUE AS is_perfect_retest,
          (yd.close / yd.ma20 - 1) * 100 AS ma20_distance_percent
        FROM yesterday_data yd
        JOIN past_breakouts_retest pb ON pb.symbol = yd.symbol
        WHERE 
          yd.ma20 IS NOT NULL
          AND yd.ma20 > 0
          AND yd.close >= (yd.ma20 * 0.98)
          AND yd.close <= (yd.ma20 * 1.05)
          AND (
            yd.close >= yd.open OR
            (yd.open - yd.low) > (yd.close - yd.open)
          )
      ),
      merged AS (
        SELECT
          yd.symbol,
          (SELECT d FROM yesterday_trade_date) AS date,
          COALESCE(cb.is_confirmed_breakout, FALSE) AS is_confirmed_breakout,
          cb.breakout_percent,
          cb.volume_ratio,
          COALESCE(pr.is_perfect_retest, FALSE) AS is_perfect_retest,
          pr.ma20_distance_percent
        FROM yesterday_data yd
        LEFT JOIN confirmed_breakout cb ON cb.symbol = yd.symbol
        LEFT JOIN perfect_retest pr ON pr.symbol = yd.symbol
      )
      SELECT
        symbol,
        date,
        is_confirmed_breakout,
        breakout_percent,
        volume_ratio,
        is_perfect_retest,
        ma20_distance_percent
      FROM merged
      WHERE 
        is_confirmed_breakout IS TRUE
        OR is_perfect_retest IS TRUE;
    `);

    type Row = {
      symbol: string;
      date: string;
      is_confirmed_breakout: boolean;
      breakout_percent: string | number | null;
      volume_ratio: string | number | null;
      is_perfect_retest: boolean;
      ma20_distance_percent: string | number | null;
    };

    const rows = result.rows as unknown as Row[];
    console.log(`📊 breakout/retest signals found: ${rows.length}`);

    if (rows.length === 0) {
      return;
    }

    // 멀티 로우 upsert
    await db
      .insert(dailyBreakoutSignals)
      .values(
        rows.map((r) => ({
          symbol: r.symbol,
          date: r.date,
          isConfirmedBreakout: r.is_confirmed_breakout,
          breakoutPercent:
            r.breakout_percent !== null
              ? String(Number(r.breakout_percent))
              : null,
          volumeRatio:
            r.volume_ratio !== null ? String(Number(r.volume_ratio)) : null,
          isPerfectRetest: r.is_perfect_retest,
          ma20DistancePercent:
            r.ma20_distance_percent !== null
              ? String(Number(r.ma20_distance_percent))
              : null,
        }))
      )
      .onConflictDoUpdate({
        target: [dailyBreakoutSignals.symbol, dailyBreakoutSignals.date],
        set: {
          isConfirmedBreakout: sql`EXCLUDED.is_confirmed_breakout`,
          breakoutPercent: sql`EXCLUDED.breakout_percent`,
          volumeRatio: sql`EXCLUDED.volume_ratio`,
          isPerfectRetest: sql`EXCLUDED.is_perfect_retest`,
          ma20DistancePercent: sql`EXCLUDED.ma20_distance_percent`,
        },
      });

    console.log("✅ Breakout signals upserted into daily_breakout_signals");
  } catch (error) {
    console.error("❌ Failed to build breakout signals:", error);
    throw error;
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  buildBreakoutSignals()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("Fatal error in build-breakout-signals:", error);
      await pool.end();
      process.exit(1);
    });
}
