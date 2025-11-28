// src/etl/jobs/calculate-daily-ratios.ts
// FMP TTM API를 사용하여 실시간 밸류에이션 지표를 가져옵니다.
import "dotenv/config";
import pLimit from "p-limit";
import { db, pool } from "@/db/client";
import { eq } from "drizzle-orm";
import { fetchJson, sleep, toStrNum } from "../utils";
import { dailyRatios, symbols } from "@/db/schema";
import { validateEnvironmentVariables } from "../utils/validation";
import {
  retryApiCall,
  retryDatabaseOperation,
  DEFAULT_RETRY_OPTIONS,
} from "../utils/retry";

const API = process.env.DATA_API!;
const KEY = process.env.FMP_API_KEY!;
const CONCURRENCY = 4;
const PAUSE_MS = 200;

interface RatiosTTM {
  peRatioTTM?: number;
  pegRatioTTM?: number;
  priceToSalesRatioTTM?: number;
  priceToBookRatioTTM?: number;
  enterpriseValueMultipleTTM?: number;
}

async function loadOne(symbol: string, targetDate: string) {
  // FMP TTM API 호출
  const url = `${API}/api/v3/ratios-ttm/${symbol}?apikey=${KEY}`;

  const response: RatiosTTM[] = await retryApiCall(
    () => fetchJson(url),
    DEFAULT_RETRY_OPTIONS
  ).catch((e) => {
    console.error(`❌ Failed to fetch TTM ratios for ${symbol}:`, e);
    return [];
  });

  if (!response || response.length === 0) {
    throw new Error(`No TTM ratio data available for ${symbol}`);
  }

  const data = response[0];

  // 모든 값이 null/undefined면 스킵
  if (
    data.peRatioTTM == null &&
    data.priceToSalesRatioTTM == null &&
    data.priceToBookRatioTTM == null &&
    data.pegRatioTTM == null &&
    data.enterpriseValueMultipleTTM == null
  ) {
    throw new Error(`All TTM ratios are null for ${symbol}`);
  }

  const ratioData = {
    symbol,
    date: targetDate,
    peRatio: toStrNum(data.peRatioTTM),
    pegRatio: toStrNum(data.pegRatioTTM),
    psRatio: toStrNum(data.priceToSalesRatioTTM),
    pbRatio: toStrNum(data.priceToBookRatioTTM),
    evEbitda: toStrNum(data.enterpriseValueMultipleTTM),
    // TTM API 사용 시 이 값들은 필요 없음 (스키마 호환성 위해 null 유지)
    marketCap: null,
    epsTtm: null,
    revenueTtm: null,
  };

  await retryDatabaseOperation(
    () =>
      db
        .insert(dailyRatios)
        .values(ratioData)
        .onConflictDoUpdate({
          target: [dailyRatios.symbol, dailyRatios.date],
          set: {
            peRatio: ratioData.peRatio,
            pegRatio: ratioData.pegRatio,
            psRatio: ratioData.psRatio,
            pbRatio: ratioData.pbRatio,
            evEbitda: ratioData.evEbitda,
          },
        }),
    DEFAULT_RETRY_OPTIONS
  );
}

async function main() {
  console.log("🚀 Starting Daily Ratios ETL (FMP TTM API)...");

  // 환경 변수 검증
  const envValidation = validateEnvironmentVariables();
  if (!envValidation.isValid) {
    console.error("❌ Environment validation failed:", envValidation.errors);
    process.exit(1);
  }

  if (envValidation.warnings.length > 0) {
    console.warn("⚠️ Environment warnings:", envValidation.warnings);
  }

  // 현재 날짜 (YYYY-MM-DD)
  const today = new Date().toISOString().split("T")[0];
  console.log(`📅 Target date: ${today}`);

  // 활성 심볼들 가져오기
  const activeSymbols = await db
    .select({ symbol: symbols.symbol })
    .from(symbols)
    .where(eq(symbols.isActivelyTrading, true));

  const syms: string[] = activeSymbols.map((s) => s.symbol);

  if (syms.length === 0) {
    throw new Error(
      "No active symbols found in database. Please run 'symbols' job first."
    );
  }

  console.log(`📊 Processing ${syms.length} active symbols`);

  const limit = pLimit(CONCURRENCY);
  let ok = 0,
    skip = 0;
  const startTime = Date.now();

  await Promise.all(
    syms.map((sym) =>
      limit(async () => {
        try {
          await loadOne(sym, today);
          ok++;
          if (ok % 100 === 0) {
            console.log(`📊 Progress: ${ok}/${syms.length} symbols processed`);
          }
        } catch (e: any) {
          skip++;
          // 에러 로깅은 심각한 경우만
          if (skip <= 10) {
            console.warn(`⚠️ Skipped ${sym}: ${e?.message}`);
          }
        } finally {
          await sleep(PAUSE_MS);
        }
      })
    )
  );

  const totalTime = Date.now() - startTime;

  console.log(`✅ Daily Ratios ETL completed!`);
  console.log(`📊 Results: ${ok} successful, ${skip} skipped`);
  console.log(`⏱️ Total time: ${Math.round(totalTime / 1000)}s`);
  console.log(
    `📈 Average time per symbol: ${Math.round(totalTime / syms.length)}ms`
  );
}

// 스크립트가 직접 실행될 때만 함수 호출
if (require.main === module) {
  main()
    .then(async () => {
      console.log("✅ Daily Ratios ETL completed successfully!");
      await pool.end();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("❌ Daily Ratios ETL failed:", error);
      await pool.end();
      process.exit(1);
    });
}

export { main as calculateDailyRatios };
