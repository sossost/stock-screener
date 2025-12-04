import "dotenv/config";
import { db, pool } from "@/db/client";
import { sql } from "drizzle-orm";

async function checkNoiseSignals() {
  try {
    // bb_width_avg_60d가 null이 아닌 데이터 확인
    const result = await db.execute(sql`
      SELECT 
        symbol, 
        date, 
        bb_width_current, 
        bb_width_avg_60d, 
        is_vcp 
      FROM daily_noise_signals 
      WHERE bb_width_avg_60d IS NOT NULL 
      LIMIT 10
    `);

    console.log("✅ bb_width_avg_60d가 있는 데이터:");
    console.log(JSON.stringify(result.rows, null, 2));

    // 전체 통계
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(bb_width_avg_60d) as with_bb_avg,
        COUNT(bb_width_current) as with_bb_current,
        COUNT(is_vcp) FILTER (WHERE is_vcp = true) as vcp_count
      FROM daily_noise_signals
    `);

    console.log("\n📊 통계:");
    console.log(JSON.stringify(stats.rows[0], null, 2));
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

checkNoiseSignals()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Fatal error:", error);
    await pool.end();
    process.exit(1);
  });
