// src/etl/jobs/detect-price-alerts.ts
import "dotenv/config";
import { db, pool } from "@/db/client";
import { sql } from "drizzle-orm";
import {
  getLatestTradeDate,
  getPreviousTradeDate,
} from "../utils/date-helpers";
import type { AlertData } from "@/lib/alerts/types";
import { ALERT_TYPES } from "@/lib/alerts/constants";
import { validateDatabaseOnlyEnvironment } from "../utils/validation";
import { sendEmailAlertBatch } from "@/lib/notifications/email";
import { sendPushNotificationBatch } from "@/lib/notifications/push";
import { priceAlerts } from "@/db/schema";

/**
 * 오늘 이미 알림을 보낸 종목 목록 조회
 * @param date 날짜 (YYYY-MM-DD)
 * @param alertType 알림 타입
 * @returns 이미 알림을 보낸 종목 심볼 배열
 */
async function getNotifiedToday(
  date: string,
  alertType: string
): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT symbol
    FROM price_alerts
    WHERE alert_date = ${date}
      AND alert_type = ${alertType}
  `);
  return (result.rows as Array<{ symbol: string }>).map((r) => r.symbol);
}

/**
 * 알림을 보낸 것으로 표시
 * @param alert 알림 데이터
 */
async function markAsNotified(alert: AlertData): Promise<void> {
  await db
    .insert(priceAlerts)
    .values({
      symbol: alert.symbol,
      alertType: alert.alertType,
      alertDate: alert.date,
      conditionData: {
        todayClose: alert.todayClose,
        todayMa20: alert.todayMa20,
        todayMa50: alert.todayMa50,
        todayMa100: alert.todayMa100,
        todayMa200: alert.todayMa200,
        prevClose: alert.prevClose,
        prevMa20: alert.prevMa20,
        breakoutPercent: alert.breakoutPercent,
        priceChangePercent: alert.priceChangePercent,
        volumeChangePercent: alert.volumeChangePercent,
      },
      notificationChannels: ["email"],
    })
    .onConflictDoNothing();
}

/**
 * 정배열 상태에서 20일선 돌파 감지
 * @returns 감지된 알림 배열
 */
async function detectMa20BreakoutOrdered(): Promise<AlertData[]> {
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
        -- 정배열 조건 (MA20 > MA50 > MA200, 100일선 제외)
        l.today_ma20 > l.today_ma50
        AND l.today_ma50 > l.today_ma200
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
 * 메인 ETL 함수
 */
async function main() {
  console.log("🚀 Starting Price Alert Detection...");

  // 환경 변수 검증 (DATABASE_URL만 필수)
  const envValidation = validateDatabaseOnlyEnvironment();
  if (!envValidation.isValid) {
    console.error("❌ Environment validation failed:", envValidation.errors);
    process.exit(1);
  }

  try {
    // 1. 알림 감지
    const alerts = await detectMa20BreakoutOrdered();
    console.log(`📊 Found ${alerts.length} alerts`);

    if (alerts.length === 0) {
      console.log("✅ No alerts detected");
      return;
    }

    // 2. 중복 알림 방지
    const latestDate = await getLatestTradeDate();
    if (!latestDate) {
      console.warn("⚠️ No latest date found");
      return;
    }

    const notified = await getNotifiedToday(
      latestDate,
      ALERT_TYPES.MA20_BREAKOUT_ORDERED
    );
    const newAlerts = alerts.filter((a) => !notified.includes(a.symbol));

    console.log(
      `📊 New alerts: ${newAlerts.length} (${
        alerts.length - newAlerts.length
      } already notified)`
    );

    // 3. 알림 정보 로깅
    for (const alert of newAlerts) {
      console.log(
        `\n📬 Alert detected for ${alert.symbol} (${alert.companyName})`
      );
      console.log(`   Date: ${alert.date}`);
      console.log(`   Today Close: $${alert.todayClose.toFixed(2)}`);
      console.log(`   Today MA20: $${alert.todayMa20.toFixed(2)}`);
      console.log(`   Breakout %: ${alert.breakoutPercent.toFixed(2)}%`);
      console.log(
        `   MA Status: ${alert.todayMa20.toFixed(
          2
        )} > ${alert.todayMa50.toFixed(2)} > ${alert.todayMa100.toFixed(
          2
        )} > ${alert.todayMa200.toFixed(2)}`
      );
    }

    // 4. 알림 전송 (이메일 및 푸시)
    if (newAlerts.length > 0) {
      // 이메일 전송
      try {
        // 환경 변수 확인
        if (
          process.env.RESEND_API_KEY &&
          process.env.NOTIFICATION_EMAIL_FROM &&
          process.env.NOTIFICATION_EMAIL_TO
        ) {
          await sendEmailAlertBatch(newAlerts);
          console.log(
            `\n📧 Email sent successfully (${newAlerts.length} alerts in one email)`
          );
        } else {
          console.log(
            `\n⚠️ Email not sent: Missing email configuration (RESEND_API_KEY, NOTIFICATION_EMAIL_FROM, or NOTIFICATION_EMAIL_TO)`
          );
        }
      } catch (error) {
        console.error(
          `\n❌ Failed to send email: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        // 이메일 전송 실패해도 계속 진행
      }

      // 푸시 알림 전송 (DB에 등록된 활성 디바이스 토큰으로 전송)
      try {
        await sendPushNotificationBatch(newAlerts);
        console.log(
          `\n📱 Push notifications sent successfully (${newAlerts.length} alerts to all devices)`
        );
      } catch (error) {
        console.error(
          `\n❌ Failed to send push notifications: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        // 푸시 알림 전송 실패해도 계속 진행
      }
    }

    // 5. 알림을 보낸 것으로 표시
    for (const alert of newAlerts) {
      await markAsNotified(alert);
    }

    console.log("\n✅ Price alert detection completed");
  } catch (error) {
    console.error("❌ Price alert detection failed:", error);
    throw error;
  }
}

// 스크립트로 직접 실행 시
if (require.main === module) {
  main()
    .then(async () => {
      console.log("✅ Price Alert Detection ETL completed successfully!");
      await pool.end();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("❌ Price Alert Detection ETL failed:", error);
      await pool.end();
      process.exit(1);
    });
}

export { main as detectPriceAlerts };
