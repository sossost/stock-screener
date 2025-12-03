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

  const balance = parseFloat(settings.cashBalance);
  return isNaN(balance) ? 0 : balance;
}

/**
 * 특정 매매의 모든 액션을 기반으로 현금 잔액 업데이트
 * 누적 오류 방지를 위해 사용자의 모든 트레이드의 모든 액션을 재계산
 * @param userId 사용자 ID
 * @param tradeId 매매 ID (사용되지 않지만 호출 호환성을 위해 유지)
 * @param commissionRate 수수료율 (%) (사용되지 않지만 호출 호환성을 위해 유지)
 */
export async function updateCashBalanceForTrade(
  userId: string,
  _tradeId: number,
  _commissionRate: number
): Promise<void> {
  // 사용자의 모든 트레이드 조회
  const { trades } = await import("@/db/schema");
  const allTrades = await db
    .select({
      id: trades.id,
      commissionRate: trades.commissionRate,
    })
    .from(trades)
    .where(eq(trades.userId, userId));

  if (allTrades.length === 0) {
    // 트레이드가 없으면 잔액을 0으로 설정
    await db
      .insert(portfolioSettings)
      .values({
        userId,
        cashBalance: "0",
      })
      .onConflictDoUpdate({
        target: portfolioSettings.userId,
        set: {
          cashBalance: "0",
          updatedAt: new Date(),
        },
      });
    return;
  }

  // 모든 트레이드의 모든 액션 조회
  const { tradeActions } = await import("@/db/schema");
  const { inArray } = await import("drizzle-orm");
  const tradeIds = allTrades.map((t) => t.id);
  const allActions = await db
    .select()
    .from(tradeActions)
    .where(inArray(tradeActions.tradeId, tradeIds));

  // 트레이드별로 그룹핑하여 각 트레이드의 수수료율 적용
  const actionsByTradeId = new Map<number, typeof allActions>();
  for (const action of allActions) {
    const existing = actionsByTradeId.get(action.tradeId) || [];
    existing.push(action);
    actionsByTradeId.set(action.tradeId, existing);
  }

  // 전체 현금 변화량 계산 (각 트레이드별 수수료율 적용)
  let totalCashChange = 0;
  for (const trade of allTrades) {
    const actions = actionsByTradeId.get(trade.id) || [];
    const commissionRate = trade.commissionRate
      ? parseFloat(trade.commissionRate)
      : 0.07;
    const cashChange = calculateCashChange(actions, commissionRate);
    totalCashChange += cashChange;
  }

  // 초기 잔액(0)에서 모든 변화량을 합산한 값으로 설정
  // TODO: 초기 잔액을 별도 필드로 관리하는 경우 이 부분 수정 필요
  const newBalance = totalCashChange;

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
