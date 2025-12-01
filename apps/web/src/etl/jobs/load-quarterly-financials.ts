import "dotenv/config";
import pLimit from "p-limit";
import { db } from "@/db/client";
import { quarterlyFinancials } from "@/db/schema";
import { sql } from "drizzle-orm";
import { asQuarter, fetchJson, sleep, toStrNum, ensureSymbol } from "../utils";
import { deduplicateByQuarter } from "../utils/quarter-deduplication";

const API = process.env.DATA_API! + "/stable";
const KEY = process.env.FMP_API_KEY!;
const CONCURRENCY = 4;
const PAUSE_MS = 150;
const LIMIT_Q = 12;

/**
 * EPS 계산 헬퍼 함수
 * API에서 EPS가 0이거나 없을 때 netIncome과 shares로 계산
 */
function calculateEPS(
  netIncome: number | null | undefined,
  shares: number | null | undefined
): number | null {
  if (!netIncome || !shares || shares === 0) {
    return null;
  }
  const eps = netIncome / shares;
  return Number.isFinite(eps) ? eps : null;
}

async function upsertQuarter(sym: string, row: any) {
  const date = row.date as string;
  const asQ = asQuarter(date);

  // EPS 계산: API 값이 0이거나 없으면 netIncome과 shares로 계산
  const netIncomeNum = row.netIncome ? Number(row.netIncome) : null;
  const sharesOut = row.weightedAverageShsOut
    ? Number(row.weightedAverageShsOut)
    : null;
  const sharesOutDil = row.weightedAverageShsOutDil
    ? Number(row.weightedAverageShsOutDil)
    : null;

  // Diluted EPS: API 값 우선, 없거나 0이면 계산
  let epsDilutedValue: number | null = null;
  const apiEpsDiluted =
    row.epsDilutedNonGAAP ?? row.adjustedEPS ?? row.epsDiluted ?? row.eps;
  if (apiEpsDiluted && Number(apiEpsDiluted) !== 0) {
    epsDilutedValue = Number(apiEpsDiluted);
  } else if (netIncomeNum && sharesOutDil) {
    // API 값이 0이거나 없으면 계산
    epsDilutedValue = calculateEPS(netIncomeNum, sharesOutDil);
  }

  // Basic EPS: API 값 우선, 없거나 0이면 계산
  let epsBasicValue: number | null = null;
  const apiEpsBasic =
    row.epsNonGAAP ?? row.epsBasicNonGAAP ?? row.epsBasic ?? row.eps;
  if (apiEpsBasic && Number(apiEpsBasic) !== 0) {
    epsBasicValue = Number(apiEpsBasic);
  } else if (netIncomeNum && sharesOut) {
    // API 값이 0이거나 없으면 계산
    epsBasicValue = calculateEPS(netIncomeNum, sharesOut);
  }

  await db
    .insert(quarterlyFinancials)
    .values({
      symbol: sym,
      periodEndDate: date,
      asOfQ: asQ,

      revenue: toStrNum(row.revenue),
      netIncome: toStrNum(row.netIncome),
      operatingIncome: toStrNum(row.operatingIncome),
      ebitda: toStrNum(row.ebitda),
      grossProfit: toStrNum(row.grossProfit),

      operatingCashFlow: toStrNum(row.operatingCashFlow),
      freeCashFlow: toStrNum(row.freeCashFlow),

      // 계산된 EPS 사용 (API 값이 0이면 계산값 사용)
      epsDiluted: epsDilutedValue !== null ? String(epsDilutedValue) : null,
      epsBasic: epsBasicValue !== null ? String(epsBasicValue) : null,
    })
    .onConflictDoUpdate({
      target: [quarterlyFinancials.symbol, quarterlyFinancials.periodEndDate],
      set: {
        asOfQ: asQ,
        revenue: toStrNum(row.revenue),
        netIncome: toStrNum(row.netIncome),
        operatingIncome: toStrNum(row.operatingIncome),
        ebitda: toStrNum(row.ebitda),
        grossProfit: toStrNum(row.grossProfit),
        operatingCashFlow: toStrNum(row.operatingCashFlow),
        freeCashFlow: toStrNum(row.freeCashFlow),
        // 계산된 EPS 사용 (API 값이 0이면 계산값 사용)
        epsDiluted: epsDilutedValue !== null ? String(epsDilutedValue) : null,
        epsBasic: epsBasicValue !== null ? String(epsBasicValue) : null,
      },
    });
}

async function loadOne(symbol: string) {
  // 손익
  const isRows: any[] = await fetchJson(
    `${API}/income-statement?symbol=${symbol}&period=quarter&limit=${LIMIT_Q}&apikey=${KEY}`
  ).catch(() => []);
  isRows.sort((a, b) => (a.date < b.date ? 1 : -1)); // 최신→과거

  // 현금흐름
  await sleep(PAUSE_MS);
  const cfRows: any[] = await fetchJson(
    `${API}/cash-flow-statement?symbol=${symbol}&period=quarter&limit=${LIMIT_Q}&apikey=${KEY}`
  ).catch(() => []);
  cfRows.sort((a, b) => (a.date < b.date ? 1 : -1));

  if (!isRows.length) throw new Error(`no income rows: ${symbol}`);

  // date 기준으로 병합 맵
  const map = new Map<string, any>();
  for (const r of isRows) map.set(r.date, { ...r });
  for (const r of cfRows) {
    const cur = map.get(r.date) ?? { date: r.date };
    map.set(r.date, { ...cur, ...r }); // operatingCashFlow/freeCashFlow 등 합치기
  }

  // 같은 분기(asOfQ)에 대해 가장 최신 날짜만 유지
  const quarterMap = deduplicateByQuarter(map);

  await ensureSymbol(symbol);

  // 최신부터 LIMIT_Q개 업서트
  for (const [, row] of quarterMap) {
    await upsertQuarter(symbol, row);
  }
}

async function main() {
  const rs = await db.execute(sql`SELECT symbol FROM symbols`);
  const syms: string[] = ((rs as any).rows ?? rs).map((r: any) => r.symbol);

  const limit = pLimit(CONCURRENCY);
  let done = 0,
    skip = 0;

  await Promise.all(
    syms.map((sym) =>
      limit(async () => {
        try {
          await loadOne(sym);
          done++;
          if (done % 50 === 0) console.log("done", done, sym);
        } catch (e: any) {
          skip++;
          console.warn("skip", sym, e?.message);
        } finally {
          await sleep(PAUSE_MS);
        }
      })
    )
  );

  console.log("quarterly load done", { done, skip });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
