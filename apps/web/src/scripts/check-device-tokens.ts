/**
 * 디바이스 토큰 확인 스크립트
 */
import "dotenv/config";
import { db, pool } from "@/db/client";
import { deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🔍 Checking device tokens...\n");

  const tokens = await db
    .select()
    .from(deviceTokens)
    .where(eq(deviceTokens.isActive, true));

  console.log(`📱 Active device tokens: ${tokens.length}\n`);

  if (tokens.length === 0) {
    console.log("❌ No active device tokens found!");
    console.log("💡 Make sure the mobile app has registered a push token.");
    console.log(
      "   The app should call /api/notifications/register-device on startup."
    );
  } else {
    tokens.forEach((token, i) => {
      console.log(`Token ${i + 1}:`);
      console.log(`  Device ID: ${token.deviceId}`);
      console.log(`  Platform: ${token.platform}`);
      console.log(`  Push Token: ${token.pushToken.substring(0, 40)}...`);
      console.log(`  Created: ${token.createdAt}`);
      console.log(`  Updated: ${token.updatedAt}`);
      console.log("");
    });
  }

  // 모든 토큰 (비활성 포함)
  const allTokens = await db.select().from(deviceTokens);
  console.log(`\n📊 Total tokens (including inactive): ${allTokens.length}`);

  await pool.end();
}

main().catch(console.error);
