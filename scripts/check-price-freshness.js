/**
 * Price data freshness check script
 *
 * - 가격 데이터가 최신인지 확인 (경고만 출력, 파이프라인 실패 안함)
 * - diff > 4일: 주말 + 휴일 고려하여 경고
 */
const { Client } = require("pg");

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    statement_timeout: 30000,
  });

  try {
    await client.connect();
    const res = await client.query(
      "select max(date)::date as d from daily_prices"
    );
    const latest = res.rows[0]?.d;

    if (!latest) {
      console.log("⚠️ No price data found");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const diff =
      (Date.parse(today) - Date.parse(latest)) / (1000 * 60 * 60 * 24);

    console.log("Latest price date:", latest);
    if (diff > 4) {
      console.log(`⚠️ Price data is ${diff} days old (may be weekend/holiday)`);
    } else {
      console.log("✅ Price data is fresh");
    }
  } catch (err) {
    console.error("⚠️ Check failed:", err.message);
  } finally {
    await client.end();
  }
})();
