// src/etl/jobs/build-noise-signals.ts
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { dailyNoiseSignals } from "@/db/schema";
import { getLatestTradeDate } from "../utils/date-helpers";
import { validateDatabaseOnlyEnvironment } from "../utils/validation";

/**
 * 노이즈 필터 계산 상수
 */
const NOISE_CONFIG = {
  // 거래량 필터
  VOLUME_DOLLAR_THRESHOLD: 10000000, // $10M
  VOLUME_SHARES_THRESHOLD: 500000, // 500K shares
  VOLUME_WINDOW_DAYS: 20, // 20일 평균
  // VCP 필터
  ATR_WINDOW_DAYS: 14, // ATR(14)
  ATR_PERCENT_THRESHOLD: 5.0, // ATR / close < 5%
  BB_WINDOW_DAYS: 20, // Bollinger Band 20일
  BB_AVG_WINDOW_DAYS: 60, // 60일 평균 비교
  BB_COMPRESSION_RATIO: 0.8, // 현재 BB 폭 < 60일 평균 * 0.8
  // 캔들 몸통 필터
  BODY_RATIO_THRESHOLD: 0.6, // 몸통이 전체 길이의 60% 이상
  // 이평선 밀집 필터
  MA_CONVERGENCE_THRESHOLD: 3.0, // MA20-MA50 간격 < 3%
} as const;

/**
 * 최신 거래일 기준으로 노이즈 필터 신호를 계산하여 daily_noise_signals 테이블에 저장
 * - 거래량 필터: 20일 평균 거래대금/거래량
 * - VCP 필터: ATR(14) + Bollinger Band 계산
 * - 캔들 몸통 필터: 최신 거래일 몸통 비율
 * - 이평선 밀집 필터: 최신 거래일 MA20-MA50 간격
 */
export async function buildNoiseSignals() {
  console.log("🚀 Building daily noise signals...");

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

    console.log(`📅 latest date: ${latestDate}`);

    // 모든 노이즈 필터를 하나의 쿼리로 계산
    const result = await db.execute(sql`
      WITH last_trade_date AS (
        SELECT MAX(date::date)::date AS d FROM daily_prices
      ),
      -- 거래량 필터: 20일 평균 거래대금/거래량
      volume_metrics AS (
        SELECT
          dp.symbol,
          dp.date::date AS d,
          dp.close,
          dp.volume,
          AVG(dp.volume * dp.close) OVER (
            PARTITION BY dp.symbol 
            ORDER BY dp.date::date 
            ROWS BETWEEN ${NOISE_CONFIG.VOLUME_WINDOW_DAYS - 1} PRECEDING AND CURRENT ROW
          ) AS avg_dollar_volume_20d,
          AVG(dp.volume) OVER (
            PARTITION BY dp.symbol 
            ORDER BY dp.date::date 
            ROWS BETWEEN ${NOISE_CONFIG.VOLUME_WINDOW_DAYS - 1} PRECEDING AND CURRENT ROW
          ) AS avg_volume_20d
        FROM daily_prices dp
        WHERE dp.date::date = (SELECT d FROM last_trade_date)
          AND dp.close IS NOT NULL
          AND dp.volume IS NOT NULL
          AND dp.volume > 0
      ),
      -- VCP 필터: ATR(14) 계산
      atr_calc AS (
        SELECT
          dp.symbol,
          dp.date::date AS d,
          dp.close,
          dp.high,
          dp.low,
          LAG(dp.close) OVER (PARTITION BY dp.symbol ORDER BY dp.date::date) AS prev_close,
          GREATEST(
            dp.high - dp.low,
            ABS(dp.high - LAG(dp.close) OVER (PARTITION BY dp.symbol ORDER BY dp.date::date)),
            ABS(dp.low - LAG(dp.close) OVER (PARTITION BY dp.symbol ORDER BY dp.date::date))
          ) AS true_range
        FROM daily_prices dp
        WHERE dp.date::date <= (SELECT d FROM last_trade_date)
          AND dp.date::date >= ((SELECT d FROM last_trade_date) - INTERVAL '${sql.raw(String(NOISE_CONFIG.BB_AVG_WINDOW_DAYS))} days')::date
          AND dp.close IS NOT NULL
          AND dp.high IS NOT NULL
          AND dp.low IS NOT NULL
      ),
      atr_values AS (
        SELECT
          symbol,
          d,
          close,
          AVG(true_range) OVER (
            PARTITION BY symbol 
            ORDER BY d 
            ROWS BETWEEN ${NOISE_CONFIG.ATR_WINDOW_DAYS - 1} PRECEDING AND CURRENT ROW
          ) AS atr_14
        FROM atr_calc
        WHERE true_range IS NOT NULL
          AND d = (SELECT d FROM last_trade_date)
      ),
      -- VCP 필터: Bollinger Band 계산
      -- 60일 평균을 계산하기 위해 최소 60일치 데이터 필요
      bb_calc AS (
        SELECT
          dp.symbol,
          dp.date::date AS d,
          dp.close,
          AVG(dp.close) OVER (
            PARTITION BY dp.symbol 
            ORDER BY dp.date::date 
            ROWS BETWEEN ${NOISE_CONFIG.BB_WINDOW_DAYS - 1} PRECEDING AND CURRENT ROW
          ) AS bb_middle,
          STDDEV(dp.close) OVER (
            PARTITION BY dp.symbol 
            ORDER BY dp.date::date 
            ROWS BETWEEN ${NOISE_CONFIG.BB_WINDOW_DAYS - 1} PRECEDING AND CURRENT ROW
          ) AS bb_stddev
        FROM daily_prices dp
        WHERE dp.date::date <= (SELECT d FROM last_trade_date)
          AND dp.date::date >= ((SELECT d FROM last_trade_date) - INTERVAL '${sql.raw(String(NOISE_CONFIG.BB_AVG_WINDOW_DAYS + NOISE_CONFIG.BB_WINDOW_DAYS))} days')::date
          AND dp.close IS NOT NULL
      ),
      bb_width_all AS (
        SELECT
          symbol,
          d,
          close,
          bb_middle,
          CASE 
            WHEN bb_middle > 0 
            THEN (bb_stddev * 2) / bb_middle 
            ELSE NULL 
          END AS bb_width_current,
          AVG(
            CASE 
              WHEN bb_middle > 0 
              THEN (bb_stddev * 2) / bb_middle 
              ELSE NULL 
            END
          ) OVER (
            PARTITION BY symbol 
            ORDER BY d 
            ROWS BETWEEN ${NOISE_CONFIG.BB_AVG_WINDOW_DAYS - 1} PRECEDING AND ${NOISE_CONFIG.BB_WINDOW_DAYS} PRECEDING
          ) AS bb_width_avg_60d
        FROM bb_calc
        WHERE bb_middle > 0 
          AND bb_stddev IS NOT NULL
      ),
      bb_width AS (
        SELECT
          symbol,
          d,
          close,
          bb_middle,
          bb_width_current,
          bb_width_avg_60d
        FROM bb_width_all
        WHERE d = (SELECT d FROM last_trade_date)
      ),
      -- 캔들 몸통 필터: 최신 거래일 몸통 비율
      body_ratio AS (
        SELECT
          dp.symbol,
          dp.date::date AS d,
          CASE 
            WHEN (dp.high - dp.low) > 0 
            THEN ABS(dp.close - dp.open) / (dp.high - dp.low)
            ELSE NULL
          END AS body_ratio
        FROM daily_prices dp
        WHERE dp.date::date = (SELECT d FROM last_trade_date)
          AND dp.close IS NOT NULL
          AND dp.open IS NOT NULL
          AND dp.high IS NOT NULL
          AND dp.low IS NOT NULL
      ),
      -- 이평선 밀집 필터: 최신 거래일 MA20-MA50 간격
      ma_convergence AS (
        SELECT
          dm.symbol,
          dm.date::date AS d,
          dm.ma20,
          dm.ma50,
          CASE 
            WHEN dm.ma50 > 0 
            THEN ((dm.ma20 - dm.ma50) / dm.ma50) * 100
            ELSE NULL
          END AS ma20_ma50_distance_percent
        FROM daily_ma dm
        WHERE dm.date::date = (SELECT d FROM last_trade_date)
          AND dm.ma20 IS NOT NULL
          AND dm.ma50 IS NOT NULL
      ),
      -- 모든 데이터 통합
      merged AS (
        SELECT
          COALESCE(vm.symbol, atr.symbol, bb.symbol, br.symbol, mc.symbol) AS symbol,
          (SELECT d FROM last_trade_date) AS date,
          vm.avg_dollar_volume_20d,
          vm.avg_volume_20d,
          atr.atr_14,
          CASE 
            WHEN atr.close > 0 
            THEN (atr.atr_14 / atr.close) * 100
            ELSE NULL
          END AS atr14_percent,
          bb.bb_width_current,
          bb.bb_width_avg_60d,
          CASE 
            WHEN atr.atr_14 IS NOT NULL 
              AND atr.close > 0 
              AND (atr.atr_14 / atr.close) < (${NOISE_CONFIG.ATR_PERCENT_THRESHOLD} / 100)
              AND bb.bb_width_current IS NOT NULL
              AND bb.bb_width_avg_60d IS NOT NULL
              AND bb.bb_width_current < (bb.bb_width_avg_60d * ${NOISE_CONFIG.BB_COMPRESSION_RATIO})
            THEN TRUE
            ELSE FALSE
          END AS is_vcp,
          br.body_ratio,
          mc.ma20_ma50_distance_percent
        FROM volume_metrics vm
        FULL OUTER JOIN atr_values atr ON atr.symbol = vm.symbol
        FULL OUTER JOIN bb_width bb ON bb.symbol = COALESCE(vm.symbol, atr.symbol)
        FULL OUTER JOIN body_ratio br ON br.symbol = COALESCE(vm.symbol, atr.symbol, bb.symbol)
        FULL OUTER JOIN ma_convergence mc ON mc.symbol = COALESCE(vm.symbol, atr.symbol, bb.symbol, br.symbol)
      )
      SELECT
        symbol,
        date,
        avg_dollar_volume_20d,
        avg_volume_20d,
        atr_14,
        atr14_percent,
        bb_width_current,
        bb_width_avg_60d,
        is_vcp,
        body_ratio,
        ma20_ma50_distance_percent
      FROM merged
      WHERE symbol IS NOT NULL;
    `);

    type Row = {
      symbol: string;
      date: string;
      avg_dollar_volume_20d: string | number | null;
      avg_volume_20d: string | number | null;
      atr_14: string | number | null;
      atr14_percent: string | number | null;
      bb_width_current: string | number | null;
      bb_width_avg_60d: string | number | null;
      is_vcp: boolean;
      body_ratio: string | number | null;
      ma20_ma50_distance_percent: string | number | null;
    };

    const rows = result.rows as unknown as Row[];
    console.log(`📊 noise signals found: ${rows.length}`);

    if (rows.length === 0) {
      console.warn("⚠️ No noise signals found");
      return;
    }

    // 멀티 로우 upsert
    await db
      .insert(dailyNoiseSignals)
      .values(
        rows.map((r) => ({
          symbol: r.symbol,
          date: r.date,
          avgDollarVolume20d:
            r.avg_dollar_volume_20d !== null
              ? String(Number(r.avg_dollar_volume_20d))
              : null,
          avgVolume20d:
            r.avg_volume_20d !== null ? String(Number(r.avg_volume_20d)) : null,
          atr14: r.atr_14 !== null ? String(Number(r.atr_14)) : null,
          atr14Percent:
            r.atr14_percent !== null ? String(Number(r.atr14_percent)) : null,
          bbWidthCurrent:
            r.bb_width_current !== null
              ? String(Number(r.bb_width_current))
              : null,
          bbWidthAvg60d:
            r.bb_width_avg_60d !== null
              ? String(Number(r.bb_width_avg_60d))
              : null,
          isVcp: r.is_vcp,
          bodyRatio:
            r.body_ratio !== null ? String(Number(r.body_ratio)) : null,
          ma20Ma50DistancePercent:
            r.ma20_ma50_distance_percent !== null
              ? String(Number(r.ma20_ma50_distance_percent))
              : null,
        }))
      )
      .onConflictDoUpdate({
        target: [dailyNoiseSignals.symbol, dailyNoiseSignals.date],
        set: {
          avgDollarVolume20d: sql`EXCLUDED.avg_dollar_volume_20d`,
          avgVolume20d: sql`EXCLUDED.avg_volume_20d`,
          atr14: sql`EXCLUDED.atr14`,
          atr14Percent: sql`EXCLUDED.atr14_percent`,
          bbWidthCurrent: sql`EXCLUDED.bb_width_current`,
          bbWidthAvg60d: sql`EXCLUDED.bb_width_avg_60d`,
          isVcp: sql`EXCLUDED.is_vcp`,
          bodyRatio: sql`EXCLUDED.body_ratio`,
          ma20Ma50DistancePercent: sql`EXCLUDED.ma20_ma50_distance_percent`,
        },
      });

    console.log("✅ Noise signals upserted into daily_noise_signals");
  } catch (error) {
    console.error("❌ Failed to build noise signals:", error);
    throw error;
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  buildNoiseSignals()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("Fatal error in build-noise-signals:", error);
      await pool.end();
      process.exit(1);
    });
}
