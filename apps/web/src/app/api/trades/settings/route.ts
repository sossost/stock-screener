import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { portfolioSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth/user";

/**
 * GET /api/trades/settings
 * 포트폴리오 설정 조회
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const [settings] = await db
      .select()
      .from(portfolioSettings)
      .where(eq(portfolioSettings.userId, userId));

    if (!settings) {
      return NextResponse.json({ cashBalance: 0 });
    }

    return NextResponse.json({
      cashBalance: parseFloat(settings.cashBalance),
    });
  } catch (error) {
    console.error("Failed to fetch portfolio settings:", error);
    return NextResponse.json(
      { error: "포트폴리오 설정 조회 실패" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trades/settings
 * 포트폴리오 설정 업데이트
 * 사용자가 설정한 cashBalance는 initialCashBalance로 저장되고,
 * 실제 cashBalance는 초기값 + 모든 액션 변화량으로 자동 계산됨
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { cashBalance } = body;

    if (cashBalance == null || cashBalance < 0) {
      return NextResponse.json(
        { error: "유효한 cashBalance 필요" },
        { status: 400 }
      );
    }

    const userId = getUserIdFromRequest(request);

    // 현재 설정 조회 (액션 변화량 계산을 위해)
    const [currentSettings] = await db
      .select()
      .from(portfolioSettings)
      .where(eq(portfolioSettings.userId, userId));

    // 사용자가 설정한 값을 initialCashBalance로 저장
    // 실제 cashBalance는 updateCashBalanceForTrade에서 자동 계산됨
    await db
      .insert(portfolioSettings)
      .values({
        userId,
        cashBalance: cashBalance.toString(), // 임시로 설정 (다음 액션 업데이트 시 재계산됨)
        initialCashBalance: cashBalance.toString(), // 초기값으로 저장
      })
      .onConflictDoUpdate({
        target: portfolioSettings.userId,
        set: {
          initialCashBalance: cashBalance.toString(), // 초기값 업데이트
          // cashBalance는 액션이 있으면 자동 계산되지만, 없으면 사용자가 설정한 값 사용
          cashBalance: currentSettings
            ? currentSettings.cashBalance // 기존 계산된 값 유지 (액션이 있는 경우)
            : cashBalance.toString(), // 액션이 없으면 사용자가 설정한 값 사용
          updatedAt: new Date(),
        },
      });

    // 액션이 있으면 잔액 재계산
    const { updateCashBalanceForTrade } =
      await import("@/lib/trades/cash-balance");
    // 더미 tradeId와 commissionRate로 호출 (실제로는 사용하지 않음)
    await updateCashBalanceForTrade(userId, 0, 0.07);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update portfolio settings:", error);
    return NextResponse.json(
      { error: "포트폴리오 설정 저장 실패" },
      { status: 500 }
    );
  }
}
