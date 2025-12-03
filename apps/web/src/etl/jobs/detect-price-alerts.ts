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

// 중복 알림 방지를 위한 메모리 캐시 (초기 구현)
// 키 형식: `${date}:${alertType}:${symbol}`
const notifiedCache = new Set<string>();

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
  // 메모리 캐시에서 해당 날짜와 타입의 알림을 보낸 종목 조회
  const notified: string[] = [];
  const prefix = `${date}:${alertType}:`;

  for (const key of notifiedCache) {
    if (key.startsWith(prefix)) {
      const symbol = key.replace(prefix, "");
      notified.push(symbol);
    }
  }

  return notified;

  // 향후 price_alerts 테이블 사용으로 전환 가능:
  // const result = await db.execute(sql`
  //   SELECT symbol
  //   FROM price_alerts
  //   WHERE alert_date = ${date}
  //     AND alert_type = ${alertType};
  // `);
  // return (result.rows as any[]).map((r) => r.symbol);
}

/**
 * 알림을 보낸 것으로 표시
 * @param alert 알림 데이터
 */
async function markAsNotified(alert: AlertData): Promise<void> {
  // 메모리 캐시에 저장 (초기 구현)
  const cacheKey = `${alert.date}:${alert.alertType}:${alert.symbol}`;
  notifiedCache.add(cacheKey);

  // 향후 price_alerts 테이블에 저장하도록 전환 가능:
  // await db.insert(priceAlerts).values({
  //   symbol: alert.symbol,
  //   alertType: alert.alertType,
  //   alertDate: alert.date,
  //   conditionData: {
  //     todayClose: alert.todayClose,
  //     todayMa20: alert.todayMa20,
  //     breakoutPercent: alert.breakoutPercent,
  //   },
  //   notificationChannels: ["email"],
  // });
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
        dm.ma20::numeric AS today_ma20,
        dm.ma50::numeric AS today_ma50,
        dm.ma100::numeric AS today_ma100,
        dm.ma200::numeric AS today_ma200
      FROM daily_prices dp
      JOIN daily_ma dm ON dp.symbol = dm.symbol AND dp.date = dm.date
      WHERE dp.date = ${latestDate}
        AND dp.adj_close IS NOT NULL
        AND dm.ma20 IS NOT NULL
        AND dm.ma50 IS NOT NULL
        AND dm.ma100 IS NOT NULL
        AND dm.ma200 IS NOT NULL
    ),
    previous AS (
      SELECT 
        dp.symbol,
        dp.adj_close::numeric AS prev_close,
        dm.ma20::numeric AS prev_ma20
      FROM daily_prices dp
      JOIN daily_ma dm ON dp.symbol = dm.symbol AND dp.date = dm.date
      WHERE dp.date = ${previousDate}
        AND dp.adj_close IS NOT NULL
        AND dm.ma20 IS NOT NULL
    ),
    ordered AS (
      SELECT 
        l.symbol,
        l.today_close,
        l.today_ma20,
        l.today_ma50,
        l.today_ma100,
        l.today_ma200,
        p.prev_close,
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
      o.today_close,
      o.today_ma20,
      o.today_ma50,
      o.today_ma100,
      o.today_ma200,
      o.prev_close,
      o.prev_ma20,
      (o.today_close / o.prev_ma20 - 1) * 100 AS breakout_percent
    FROM ordered o
    JOIN symbols s ON o.symbol = s.symbol
    ORDER BY o.symbol;
  `);

  interface AlertRow {
    symbol: string;
    company_name: string | null;
    today_close: string;
    today_ma20: string;
    today_ma50: string;
    today_ma100: string;
    today_ma200: string;
    prev_close: string;
    prev_ma20: string;
    breakout_percent: string;
    [key: string]: unknown;
  }

  return (result.rows as unknown as AlertRow[]).map((r) => ({
    symbol: r.symbol,
    companyName: r.company_name || r.symbol,
    alertType: ALERT_TYPES.MA20_BREAKOUT_ORDERED,
    todayClose: Number(r.today_close),
    todayMa20: Number(r.today_ma20),
    todayMa50: Number(r.today_ma50),
    todayMa100: Number(r.today_ma100),
    todayMa200: Number(r.today_ma200),
    prevClose: Number(r.prev_close),
    prevMa20: Number(r.prev_ma20),
    breakoutPercent: Number(r.breakout_percent),
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

    // 3. 알림 정보 출력 (Phase 1에서는 로깅만)
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

      // 알림을 보낸 것으로 표시
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
