/**
 * 돌파매매 필터 테스트 스크립트
 *
 * 사용법:
 * cd apps/web
 * yarn tsx src/scripts/test-breakout-filter.ts [confirmed|retest]
 */
import "dotenv/config";
import { db, pool } from "@/db/client";
import { sql } from "drizzle-orm";
import {
  getLatestTradeDate,
  getPreviousTradeDate,
} from "@/etl/utils/date-helpers";

async function testConfirmedBreakout() {
  console.log("🧪 확정 돌파 필터 테스트 시작...\n");

  const latestDate = await getLatestTradeDate();
  if (!latestDate) {
    console.error("❌ 최신 거래일을 찾을 수 없습니다.");
    return;
  }
  console.log(`📅 최신 거래일: ${latestDate}`);

  const previousDate = await getPreviousTradeDate(latestDate);
  if (!previousDate) {
    console.error("❌ 어제 거래일을 찾을 수 없습니다.");
    console.log("💡 ETL을 실행하여 최신 데이터를 업데이트하세요:");
    console.log("   yarn etl:daily-prices");
    return;
  }
  console.log(`📅 어제 거래일: ${previousDate}\n`);

  try {
    // 확정 돌파 쿼리 테스트
    const result = await db.execute(sql`
      WITH last_trade_date_breakout AS (
        SELECT MAX(date::date)::date AS d FROM daily_prices
      ),
      yesterday_trade_date_breakout AS (
        SELECT MAX(date::date)::date AS d 
        FROM daily_prices 
        WHERE date::date < (SELECT d FROM last_trade_date_breakout)
      ),
      yesterday_data_breakout AS (
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
        WHERE dp.date::date = (SELECT d FROM yesterday_trade_date_breakout)
          AND (SELECT d FROM yesterday_trade_date_breakout) IS NOT NULL
          AND dp.close IS NOT NULL
          AND dp.high IS NOT NULL
          AND dp.low IS NOT NULL
          AND dp.volume IS NOT NULL
          AND dp.volume > 0
      ),
      confirmed_breakout AS (
        SELECT symbol
        FROM yesterday_data_breakout
        WHERE 
          high_20d IS NOT NULL
          AND avg_volume_20d IS NOT NULL
          AND avg_volume_20d > 0
          AND close >= high_20d
          AND volume >= (avg_volume_20d * 2.0)
          AND (high - low) > 0
          AND (high - close) < ((high - low) * 0.2)
      )
      SELECT COUNT(*) as count
      FROM confirmed_breakout;
    `);

    const count = (result.rows[0] as { count: string }).count;
    console.log(`✅ 확정 돌파 조건을 만족하는 종목: ${count}개\n`);

    if (Number(count) > 0) {
      // 상위 10개 종목 조회
      const symbolsResult = await db.execute(sql`
        WITH last_trade_date_breakout AS (
          SELECT MAX(date::date)::date AS d FROM daily_prices
        ),
        yesterday_trade_date_breakout AS (
          SELECT MAX(date::date)::date AS d 
          FROM daily_prices 
          WHERE date::date < (SELECT d FROM last_trade_date_breakout)
        ),
        yesterday_data_breakout AS (
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
          WHERE dp.date::date = (SELECT d FROM yesterday_trade_date_breakout)
            AND (SELECT d FROM yesterday_trade_date_breakout) IS NOT NULL
            AND dp.close IS NOT NULL
            AND dp.high IS NOT NULL
            AND dp.low IS NOT NULL
            AND dp.volume IS NOT NULL
            AND dp.volume > 0
        ),
        confirmed_breakout AS (
          SELECT 
            symbol,
            close,
            high_20d,
            volume,
            avg_volume_20d,
            (close / high_20d - 1) * 100 as breakout_percent,
            (volume / avg_volume_20d) as volume_ratio
          FROM yesterday_data_breakout
          WHERE 
            high_20d IS NOT NULL
            AND avg_volume_20d IS NOT NULL
            AND avg_volume_20d > 0
            AND close >= high_20d
            AND volume >= (avg_volume_20d * 2.0)
            AND (high - low) > 0
            AND (high - close) < ((high - low) * 0.2)
        )
        SELECT * FROM confirmed_breakout
        ORDER BY breakout_percent DESC
        LIMIT 10;
      `);

      console.log("📊 상위 10개 종목:");
      symbolsResult.rows.forEach((row: any, idx: number) => {
        console.log(
          `  ${idx + 1}. ${row.symbol}: 돌파율 ${Number(row.breakout_percent).toFixed(2)}%, 거래량 ${Number(row.volume_ratio).toFixed(2)}배`
        );
      });
    }
  } catch (error) {
    console.error("❌ 쿼리 실행 실패:", error);
    throw error;
  }
}

async function testPerfectRetest() {
  console.log("🧪 완벽한 재테스트 필터 테스트 시작...\n");

  const latestDate = await getLatestTradeDate();
  if (!latestDate) {
    console.error("❌ 최신 거래일을 찾을 수 없습니다.");
    return;
  }
  console.log(`📅 최신 거래일: ${latestDate}`);

  const previousDate = await getPreviousTradeDate(latestDate);
  if (!previousDate) {
    console.error("❌ 어제 거래일을 찾을 수 없습니다.");
    console.log("💡 ETL을 실행하여 최신 데이터를 업데이트하세요:");
    console.log("   yarn etl:daily-prices");
    return;
  }
  console.log(`📅 어제 거래일: ${previousDate}\n`);

  try {
    // 완벽한 재테스트 쿼리 테스트
    const result = await db.execute(sql`
      WITH last_trade_date_retest AS (
        SELECT MAX(date::date)::date AS d FROM daily_prices
      ),
      yesterday_trade_date_retest AS (
        SELECT MAX(date::date)::date AS d 
        FROM daily_prices 
        WHERE date::date < (SELECT d FROM last_trade_date_retest)
      ),
      yesterday_data_retest AS (
        SELECT
          dp.symbol,
          dp.close,
          dp.open,
          dp.low,
          dp.high,
          dm.ma20,
          dm.ma50,
          dm.ma200
        FROM daily_prices dp
        JOIN daily_ma dm ON dp.symbol = dm.symbol AND dp.date::date = dm.date::date
        WHERE dp.date::date = (SELECT d FROM yesterday_trade_date_retest)
          AND (SELECT d FROM yesterday_trade_date_retest) IS NOT NULL
          AND dp.close IS NOT NULL
          AND dp.open IS NOT NULL
          AND dp.low IS NOT NULL
          AND dp.high IS NOT NULL
          AND dm.ma20 IS NOT NULL
          AND dm.ma50 IS NOT NULL
          AND dm.ma200 IS NOT NULL
          AND dm.ma20 > 0
          AND dm.ma50 > 0
          AND dm.ma200 > 0
          AND dm.ma20 > dm.ma50
          AND dm.ma50 > dm.ma200
      ),
      past_breakouts_retest AS (
        SELECT DISTINCT dp.symbol
        FROM daily_prices dp
            WHERE (SELECT d FROM last_trade_date_retest) IS NOT NULL
              AND dp.date::date BETWEEN 
                ((SELECT d FROM last_trade_date_retest) - INTERVAL '10 days')::date AND
                ((SELECT d FROM last_trade_date_retest) - INTERVAL '3 days')::date
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
        SELECT yd.symbol
        FROM yesterday_data_retest yd
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
      )
      SELECT COUNT(*) as count
      FROM perfect_retest;
    `);

    const count = (result.rows[0] as { count: string }).count;
    console.log(`✅ 완벽한 재테스트 조건을 만족하는 종목: ${count}개\n`);

    if (Number(count) > 0) {
      console.log("📊 조건을 만족하는 종목 목록:");
      const symbolsResult = await db.execute(sql`
          WITH last_trade_date_retest AS (
            SELECT MAX(date::date)::date AS d FROM daily_prices
          ),
          yesterday_trade_date_retest AS (
            SELECT MAX(date::date)::date AS d 
            FROM daily_prices 
            WHERE date::date < (SELECT d FROM last_trade_date_retest)
          ),
          yesterday_data_retest AS (
            SELECT
              dp.symbol,
              dp.close,
              dp.open,
              dp.low,
              dp.high,
              dm.ma20,
              dm.ma50,
              dm.ma200
            FROM daily_prices dp
            JOIN daily_ma dm ON dp.symbol = dm.symbol AND dp.date::date = dm.date::date
            WHERE dp.date::date = (SELECT d FROM yesterday_trade_date_retest)
            AND (SELECT d FROM yesterday_trade_date_retest) IS NOT NULL
            AND dp.close IS NOT NULL
            AND dp.open IS NOT NULL
            AND dp.low IS NOT NULL
            AND dp.high IS NOT NULL
            AND dm.ma20 IS NOT NULL
            AND dm.ma50 IS NOT NULL
            AND dm.ma200 IS NOT NULL
            AND dm.ma20 > 0
            AND dm.ma50 > 0
            AND dm.ma200 > 0
            AND dm.ma20 > dm.ma50
            AND dm.ma50 > dm.ma200
        ),
        past_breakouts_retest AS (
          SELECT DISTINCT dp.symbol
          FROM daily_prices dp
          WHERE (SELECT d FROM last_trade_date_retest) IS NOT NULL
            AND dp.date::date BETWEEN 
              ((SELECT d FROM last_trade_date_retest) - INTERVAL '10 days')::date AND
              ((SELECT d FROM last_trade_date_retest) - INTERVAL '3 days')::date
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
            yd.close,
            yd.ma20,
            (yd.close / yd.ma20 - 1) * 100 as ma20_distance_percent
          FROM yesterday_data_retest yd
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
        )
        SELECT * FROM perfect_retest
        ORDER BY symbol
        LIMIT 10;
      `);

      symbolsResult.rows.forEach((row: any, idx: number) => {
        console.log(
          `  ${idx + 1}. ${row.symbol}: 종가 ${Number(row.close).toFixed(2)}, 20일선 대비 ${Number(row.ma20_distance_percent).toFixed(2)}%`
        );
      });
    }
  } catch (error) {
    console.error("❌ 쿼리 실행 실패:", error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const strategy = args[0] as "confirmed" | "retest" | undefined;

  try {
    if (strategy === "confirmed") {
      await testConfirmedBreakout();
    } else if (strategy === "retest") {
      await testPerfectRetest();
    } else {
      console.log("📋 돌파매매 필터 테스트\n");
      console.log("사용법:");
      console.log(
        "  yarn tsx src/scripts/test-breakout-filter.ts confirmed  # 확정 돌파 테스트"
      );
      console.log(
        "  yarn tsx src/scripts/test-breakout-filter.ts retest     # 완벽한 재테스트 테스트\n"
      );

      await testConfirmedBreakout();
      console.log("\n" + "=".repeat(50) + "\n");
      await testPerfectRetest();
    }
  } catch (error) {
    console.error("❌ 테스트 실패:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}
