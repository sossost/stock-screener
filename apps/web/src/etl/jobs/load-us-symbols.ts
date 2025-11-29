// src/etl/jobs/load-us-symbols.ts
// NASDAQ, NYSE, AMEX 거래소 심볼 로드
import "dotenv/config";
import { db, pool } from "@/db/client";
import { symbols } from "@/db/schema";
import {
  validateEnvironmentVariables,
  validateSymbolData,
  validateBatchData,
} from "../utils/validation";
import { retryApiCall, DEFAULT_RETRY_OPTIONS } from "../utils/retry";
import { fetchJson } from "../utils";

const API = process.env.DATA_API! + "/stable";
const KEY = process.env.FMP_API_KEY!;

type SymbolRow = {
  symbol: string;
  companyName?: string;
  marketCap?: number;
  sector?: string;
  industry?: string;
  beta?: number;
  price?: number;
  lastAnnualDividend?: number;
  volume?: number;
  exchange?: string;
  exchangeShortName?: string;
  country?: string;
  isEtf?: boolean;
  isFund?: boolean;
  isActivelyTrading?: boolean;
};

// 지원 거래소 목록
const SUPPORTED_EXCHANGES = ["NASDAQ", "NYSE", "AMEX"];

async function main() {
  console.log("🚀 Starting US symbols ETL (NASDAQ, NYSE, AMEX)...");

  // 환경 변수 검증
  const envValidation = validateEnvironmentVariables();
  if (!envValidation.isValid) {
    console.error("❌ Environment validation failed:", envValidation.errors);
    process.exit(1);
  }

  if (envValidation.warnings.length > 0) {
    console.warn("⚠️ Environment warnings:", envValidation.warnings);
  }

  // 각 거래소별로 API 병렬 호출
  console.log(`📡 Fetching symbols from ${SUPPORTED_EXCHANGES.join(", ")}...`);
  
  const results = await Promise.all(
    SUPPORTED_EXCHANGES.map(async (exchange) => {
      const list = await retryApiCall(
        () =>
          fetchJson<SymbolRow[]>(
            `${API}/company-screener?exchange=${exchange}&limit=10000&apikey=${KEY}`
          ),
        DEFAULT_RETRY_OPTIONS
      );
      console.log(`  → ${list.length} symbols from ${exchange}`);
      return list;
    })
  );

  const allSymbols = results.flat();

  console.log(`📊 Fetched ${allSymbols.length} total symbols from API`);

  const validSymbols = allSymbols
    .filter((r) => SUPPORTED_EXCHANGES.includes(r.exchangeShortName || ""))
    .filter((r) => {
      // 정상적인 주식만 필터링 (워런트, 우선주, ETF 등 제외)
      const symbol = r.symbol;
      return (
        symbol &&
        /^[A-Z]{1,5}$/.test(symbol) && // 1-5글자 대문자만
        !symbol.endsWith("W") && // 워런트 제외
        !symbol.endsWith("X") && // 워런트 제외
        !symbol.includes(".") && // 점 포함 제외
        !symbol.endsWith("U") && // 유닛 제외
        !symbol.endsWith("WS") && // 워런트 제외
        !r.isEtf && // ETF 제외
        !r.isFund
      ); // 펀드 제외
    });

  console.log(`📈 Filtered to ${validSymbols.length} valid US symbols`);

  // 데이터 검증
  const validationResult = validateBatchData(validSymbols, validateSymbolData);
  if (!validationResult.isValid) {
    console.error("❌ Data validation failed:", validationResult.errors);
    process.exit(1);
  }

  if (validationResult.warnings.length > 0) {
    console.warn("⚠️ Data validation warnings:", validationResult.warnings);
  }

  // 배치 처리로 성능 개선
  const batchSize = 100;
  let processedCount = 0;

  for (let i = 0; i < validSymbols.length; i += batchSize) {
    const batch = validSymbols.slice(i, i + batchSize);
    console.log(
      `📊 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        validSymbols.length / batchSize
      )} (${batch.length} symbols)`
    );

    for (const r of batch) {
      const row = {
        symbol: r.symbol,
        companyName: r.companyName || null,
        marketCap: r.marketCap?.toString() || null,
        sector: r.sector || null,
        industry: r.industry || null,
        beta: r.beta?.toString() || null,
        price: r.price?.toString() || null,
        lastAnnualDividend: r.lastAnnualDividend?.toString() || null,
        volume: r.volume?.toString() || null,
        exchange: r.exchange || null,
        exchangeShortName: r.exchangeShortName || null,
        country: r.country || null,
        isEtf: r.isEtf || false,
        isFund: r.isFund || false,
        isActivelyTrading: r.isActivelyTrading ?? true,
        createdAt: new Date(),
      };

      await db
        .insert(symbols)
        .values(row)
        .onConflictDoUpdate({
          target: symbols.symbol,
          set: {
            ...row,
            createdAt: new Date(),
          },
        });

      processedCount++;
    }
  }

  console.log(`✅ Successfully processed ${processedCount} US symbols`);
}

// 스크립트가 직접 실행될 때만 함수 호출
if (require.main === module) {
  main()
    .then(async () => {
      console.log("✅ US symbols ETL completed successfully!");
      await pool.end();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("❌ US symbols ETL failed:", error);
      await pool.end();
      process.exit(1);
    });
}

export { main as loadUSSymbols };
