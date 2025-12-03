import { db } from "@/db/client";
import { sql } from "drizzle-orm";

interface DateResult {
  latest_date?: string;
  prev_date?: string;
  [key: string]: unknown;
}

/**
 * 최신 거래일 조회
 * @returns 최신 거래일 (YYYY-MM-DD 형식) 또는 undefined
 */
export async function getLatestTradeDate(): Promise<string | undefined> {
  const result = await db.execute(sql`
    SELECT MAX(date)::date AS latest_date
    FROM daily_prices;
  `);
  const row = result.rows[0] as DateResult | undefined;
  return row?.latest_date;
}

/**
 * 전일 거래일 조회
 * @param currentDate 현재 거래일 (YYYY-MM-DD 형식)
 * @returns 전일 거래일 (YYYY-MM-DD 형식) 또는 null
 */
export async function getPreviousTradeDate(
  currentDate: string
): Promise<string | null> {
  if (!currentDate || !/^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
    throw new Error(`Invalid date format: ${currentDate}. Expected YYYY-MM-DD`);
  }

  const result = await db.execute(sql`
    SELECT MAX(date)::date AS prev_date
    FROM daily_prices
    WHERE date < ${currentDate};
  `);
  const row = result.rows[0] as DateResult | undefined;
  return row?.prev_date || null;
}
