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
 * 최종 잔액 = 초기 잔액 + 모든 액션의 변화량
 * @param userId 사용자 ID
 * @param tradeId 매매 ID (사용되지 않지만 호출 호환성을 위해 유지)
 * @param commissionRate 수수료율 (%) (사용되지 않지만 호출 호환성을 위해 유지)
 */
export async function updateCashBalanceForTrade(
  userId: string,
  _tradeId: number,
  _commissionRate: number
): Promise<void> {
  // 현재 설정 조회 (초기 잔액 확인)
  const [currentSettings] = await db
    .select()
    .from(portfolioSettings)
    .where(eq(portfolioSettings.userId, userId));

  // 사용자의 모든 트레이드 조회
  const { trades } = await import("@/db/schema");
  const allTrades = await db
    .select({
      id: trades.id,
      commissionRate: trades.commissionRate,
    })
    .from(trades)
    .where(eq(trades.userId, userId));

  // 모든 트레이드의 모든 액션 조회
  const { tradeActions } = await import("@/db/schema");
  const { inArray } = await import("drizzle-orm");
  const tradeIds = allTrades.map((t) => t.id);
  const allActions =
    tradeIds.length > 0
      ? await db
          .select()
          .from(tradeActions)
          .where(inArray(tradeActions.tradeId, tradeIds))
      : [];

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

  // 초기 잔액 설정
  // initialCashBalance가 있으면 그것을 사용
  // 없으면 현재 cashBalance에서 모든 액션 변화량을 빼서 역산
  let initialBalance: number;
  if (currentSettings?.initialCashBalance) {
    initialBalance = parseFloat(currentSettings.initialCashBalance);
  } else if (currentSettings?.cashBalance) {
    // 현재 cashBalance에서 모든 액션 변화량을 빼서 초기값 역산
    const currentBalance = parseFloat(currentSettings.cashBalance);
    initialBalance = currentBalance - totalCashChange;
  } else {
    // 둘 다 없으면 0
    initialBalance = 0;
  }

  if (allTrades.length === 0) {
    // 트레이드가 없으면 초기 잔액으로 설정
    await db
      .insert(portfolioSettings)
      .values({
        userId,
        cashBalance: initialBalance.toString(),
        initialCashBalance: initialBalance.toString(),
      })
      .onConflictDoUpdate({
        target: portfolioSettings.userId,
        set: {
          cashBalance: initialBalance.toString(),
          // initialCashBalance는 기존 값 유지 (사용자가 설정한 초기값 보존)
          initialCashBalance: currentSettings?.initialCashBalance
            ? currentSettings.initialCashBalance
            : initialBalance.toString(),
          updatedAt: new Date(),
        },
      });
    return;
  }

  // 최종 잔액 = 초기 잔액 + 모든 액션의 변화량
  const newBalance = initialBalance + totalCashChange;

  // 현금 잔액 업데이트 (upsert)
  // initialCashBalance는 사용자가 수동으로 설정한 경우에만 업데이트 (액션 추가/수정/삭제 시에는 유지)
  await db
    .insert(portfolioSettings)
    .values({
      userId,
      cashBalance: newBalance.toString(),
      initialCashBalance: initialBalance.toString(),
    })
    .onConflictDoUpdate({
      target: portfolioSettings.userId,
      set: {
        cashBalance: newBalance.toString(),
        // initialCashBalance는 기존 값 유지 (사용자가 설정한 초기값 보존)
        initialCashBalance: currentSettings?.initialCashBalance
          ? currentSettings.initialCashBalance
          : initialBalance.toString(),
        updatedAt: new Date(),
      },
    });
}

/**
 * 액션 배열을 기반으로 현금 잔액 업데이트
 * @deprecated 이 함수는 누적 오류를 야기할 수 있습니다. 대신 updateCashBalanceForTrade를 사용하세요.
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

  // 현재 설정 조회 (초기 잔액 확인)
  const [currentSettings] = await db
    .select()
    .from(portfolioSettings)
    .where(eq(portfolioSettings.userId, userId));

  // 초기 잔액 설정
  const initialBalance = currentSettings?.initialCashBalance
    ? parseFloat(currentSettings.initialCashBalance)
    : currentSettings?.cashBalance
      ? parseFloat(currentSettings.cashBalance)
      : 0;

  // 새로운 잔액 계산 (초기 잔액 + 변화량)
  // 주의: 이 함수는 단일 액션 배열만 처리하므로, 모든 액션을 재계산하는 updateCashBalanceForTrade 사용 권장
  const newBalance = initialBalance + cashChange;

  // 현금 잔액 업데이트 (upsert)
  await db
    .insert(portfolioSettings)
    .values({
      userId,
      cashBalance: newBalance.toString(),
      initialCashBalance: initialBalance.toString(),
    })
    .onConflictDoUpdate({
      target: portfolioSettings.userId,
      set: {
        cashBalance: newBalance.toString(),
        // initialCashBalance는 기존 값 유지
        initialCashBalance: currentSettings?.initialCashBalance
          ? currentSettings.initialCashBalance
          : initialBalance.toString(),
        updatedAt: new Date(),
      },
    });
}
