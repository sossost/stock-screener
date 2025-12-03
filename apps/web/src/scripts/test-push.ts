/**
 * 푸시 알림 테스트 스크립트 (실제 돌파 데이터 사용)
 *
 * 사용법:
 * cd apps/web
 * tsx src/scripts/test-push.ts
 *
 * 옵션:
 * --dummy: 더미 데이터 사용 (기본값: 실제 데이터 사용)
 */
import "dotenv/config";
import { sendPushNotificationBatch } from "@/lib/notifications/push";
import { ALERT_TYPES } from "@/lib/alerts/constants";
import type { AlertData } from "@/lib/alerts/types";
import { pool } from "@/db/client";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import {
  getLatestTradeDate,
  getPreviousTradeDate,
} from "@/etl/utils/date-helpers";

/**
 * 실제 돌파 데이터 조회 (detect-price-alerts.ts의 로직 재사용)
 */
async function getActualBreakoutAlerts(): Promise<AlertData[]> {
  const latestDate = await getLatestTradeDate();
  if (!latestDate) {
    console.warn("⚠️ No trade date found");
    return [];
  }

  const previousDate = await getPreviousTradeDate(latestDate);
  if (!previousDate) {
    console.warn("⚠️ No previous trade date found");
    return [];
  }

  const result = await db.execute(sql`
    WITH latest AS (
      SELECT 
        dp.symbol,
        dp.adj_close::numeric AS today_close,
        dp.volume::numeric AS today_volume,
        dm.ma20::numeric AS today_ma20,
        dm.ma50::numeric AS today_ma50,
        dm.ma100::numeric AS today_ma100,
        dm.ma200::numeric AS today_ma200
      FROM daily_prices dp
      JOIN daily_ma dm ON dp.symbol = dm.symbol AND dp.date = dm.date
      WHERE dp.date = ${latestDate}
        AND dp.adj_close IS NOT NULL
        AND dp.volume IS NOT NULL
        AND dm.ma20 IS NOT NULL
        AND dm.ma50 IS NOT NULL
        AND dm.ma100 IS NOT NULL
        AND dm.ma200 IS NOT NULL
    ),
    previous AS (
      SELECT 
        dp.symbol,
        dp.adj_close::numeric AS prev_close,
        dp.volume::numeric AS prev_volume,
        dm.ma20::numeric AS prev_ma20
      FROM daily_prices dp
      JOIN daily_ma dm ON dp.symbol = dm.symbol AND dp.date = dm.date
      WHERE dp.date = ${previousDate}
        AND dp.adj_close IS NOT NULL
        AND dp.volume IS NOT NULL
        AND dm.ma20 IS NOT NULL
    ),
    ordered AS (
      SELECT 
        l.symbol,
        l.today_close,
        l.today_volume,
        l.today_ma20,
        l.today_ma50,
        l.today_ma100,
        l.today_ma200,
        p.prev_close,
        p.prev_volume,
        p.prev_ma20
      FROM latest l
      JOIN previous p ON l.symbol = p.symbol
      WHERE 
        -- 정배열 조건
        l.today_ma20 > l.today_ma50
        AND l.today_ma50 > l.today_ma100
        AND l.today_ma100 > l.today_ma200
        -- 20일선 돌파 조건
        AND p.prev_close < p.prev_ma20  -- 전일 종가 < 전일 ma20
        AND l.today_close > l.today_ma20  -- 오늘 종가 > 오늘 ma20
    )
    SELECT 
      o.symbol,
      s.company_name,
      s.sector,
      s.market_cap,
      o.today_close,
      o.today_volume,
      o.today_ma20,
      o.today_ma50,
      o.today_ma100,
      o.today_ma200,
      o.prev_close,
      o.prev_volume,
      o.prev_ma20,
      (o.today_close / o.prev_ma20 - 1) * 100 AS breakout_percent,
      (o.today_close / o.prev_close - 1) * 100 AS price_change_percent,
      CASE 
        WHEN o.prev_volume > 0 THEN (o.today_volume / o.prev_volume - 1) * 100
        ELSE NULL
      END AS volume_change_percent
    FROM ordered o
    JOIN symbols s ON o.symbol = s.symbol
    ORDER BY o.symbol;
    -- LIMIT 제거: 실제 ETL과 동일하게 모든 종목 조회
  `);

  interface AlertRow {
    symbol: string;
    company_name: string | null;
    sector: string | null;
    market_cap: string | null;
    today_close: string;
    today_volume: string;
    today_ma20: string;
    today_ma50: string;
    today_ma100: string;
    today_ma200: string;
    prev_close: string;
    prev_volume: string;
    prev_ma20: string;
    breakout_percent: string;
    price_change_percent: string;
    volume_change_percent: string | null;
    [key: string]: unknown;
  }

  return (result.rows as unknown as AlertRow[]).map((r) => ({
    symbol: r.symbol,
    companyName: r.company_name || r.symbol,
    sector: r.sector || null,
    marketCap: r.market_cap ? Number(r.market_cap) : null,
    alertType: ALERT_TYPES.MA20_BREAKOUT_ORDERED,
    todayClose: Number(r.today_close),
    todayVolume: Number(r.today_volume),
    todayMa20: Number(r.today_ma20),
    todayMa50: Number(r.today_ma50),
    todayMa100: Number(r.today_ma100),
    todayMa200: Number(r.today_ma200),
    prevClose: Number(r.prev_close),
    prevVolume: Number(r.prev_volume),
    prevMa20: Number(r.prev_ma20),
    breakoutPercent: Number(r.breakout_percent),
    priceChangePercent: Number(r.price_change_percent),
    volumeChangePercent: r.volume_change_percent
      ? Number(r.volume_change_percent)
      : 0,
    date: latestDate,
  }));
}

/**
 * 더미 테스트 데이터 생성
 */
function getDummyAlert(): AlertData {
  return {
    symbol: "AAPL",
    companyName: "Apple Inc.",
    sector: "Technology",
    marketCap: 2_500_000_000_000,
    alertType: ALERT_TYPES.MA20_BREAKOUT_ORDERED,
    todayClose: 150.25,
    todayMa20: 148.5,
    todayMa50: 145.0,
    todayMa100: 140.0,
    todayMa200: 135.0,
    prevClose: 147.0,
    prevMa20: 148.0,
    todayVolume: 50000000,
    prevVolume: 40000000,
    breakoutPercent: 1.52,
    priceChangePercent: 2.21,
    volumeChangePercent: 25.0,
    date: new Date().toISOString().split("T")[0],
  };
}

async function main() {
  const useDummy = process.argv.includes("--dummy");

  console.log(
    `🧪 Testing push notification with ${useDummy ? "dummy" : "actual"} data...`
  );

  try {
    let alerts: AlertData[];

    if (useDummy) {
      alerts = [getDummyAlert()];
      console.log("📊 Using dummy data:", alerts[0].symbol);
    } else {
      alerts = await getActualBreakoutAlerts();
      if (alerts.length === 0) {
        console.log("⚠️ No actual breakout alerts found in database");
        console.log("💡 Tip: Run with --dummy flag to use dummy data");
        return;
      }
      console.log(`📊 Found ${alerts.length} actual breakout alerts:`);
      alerts.forEach((alert) => {
        console.log(
          `  - ${alert.symbol} (${alert.companyName}): ${alert.breakoutPercent.toFixed(2)}% breakout`
        );
      });
    }

    await sendPushNotificationBatch(alerts);
    console.log(
      `✅ Push notification sent successfully (${alerts.length} alert${alerts.length > 1 ? "s" : ""})`
    );
    console.log("\n📱 Check your mobile device for the notification");
  } catch (error) {
    console.error("❌ Failed to send test push notification:", error);
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
