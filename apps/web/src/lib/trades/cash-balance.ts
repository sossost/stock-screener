import { db } from "@/db/client";
import { portfolioSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateCashChange } from "./calculations";
import { TradeAction } from "./types";

/**
 * 사용자의 현금 잔액 조회
 */
export async function getCashBalance(userId: string): Promise<number> {
  const [settings] = await db
    .select()
    .from(portfolioSettings)
    .where(eq(portfolioSettings.userId, userId));

  if (!settings) {
    return 0;
  }

  return parseFloat(settings.cashBalance);
}

/**
 * 특정 매매의 모든 액션을 기반으로 현금 잔액 업데이트
 * @param userId 사용자 ID
 * @param tradeId 매매 ID
 * @param commissionRate 수수료율 (%)
 */
export async function updateCashBalanceForTrade(
  userId: string,
  tradeId: number,
  commissionRate: number
): Promise<void> {
  // 해당 매매의 모든 액션 조회
  const { tradeActions } = await import("@/db/schema");
  const actions = await db
    .select()
    .from(tradeActions)
    .where(eq(tradeActions.tradeId, tradeId));

  // 현금 변화량 계산
  const cashChange = calculateCashChange(actions, commissionRate);

  // 현재 현금 잔액 조회
  const currentBalance = await getCashBalance(userId);

  // 새로운 잔액 계산
  const newBalance = currentBalance + cashChange;

  // 현금 잔액 업데이트 (upsert)
  await db
    .insert(portfolioSettings)
    .values({
      userId,
      cashBalance: newBalance.toString(),
    })
    .onConflictDoUpdate({
      target: portfolioSettings.userId,
      set: {
        cashBalance: newBalance.toString(),
        updatedAt: new Date(),
      },
    });
}

/**
 * 액션 배열을 기반으로 현금 잔액 업데이트
 * @param userId 사용자 ID
 * @param actions 액션 배열
 * @param commissionRate 수수료율 (%)
 */
export async function updateCashBalanceFromActions(
  userId: string,
  actions: TradeAction[],
  commissionRate: number
): Promise<void> {
  // 현금 변화량 계산
  const cashChange = calculateCashChange(actions, commissionRate);

  // 현재 현금 잔액 조회
  const currentBalance = await getCashBalance(userId);

  // 새로운 잔액 계산
  const newBalance = currentBalance + cashChange;

  // 현금 잔액 업데이트 (upsert)
  await db
    .insert(portfolioSettings)
    .values({
      userId,
      cashBalance: newBalance.toString(),
    })
    .onConflictDoUpdate({
      target: portfolioSettings.userId,
      set: {
        cashBalance: newBalance.toString(),
        updatedAt: new Date(),
      },
    });
}
