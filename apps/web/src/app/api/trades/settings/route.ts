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

    // upsert
    await db
      .insert(portfolioSettings)
      .values({
        userId,
        cashBalance: cashBalance.toString(),
      })
      .onConflictDoUpdate({
        target: portfolioSettings.userId,
        set: {
          cashBalance: cashBalance.toString(),
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update portfolio settings:", error);
    return NextResponse.json(
      { error: "포트폴리오 설정 저장 실패" },
      { status: 500 }
    );
  }
}
