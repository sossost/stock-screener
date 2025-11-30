import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { assetSnapshots } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

const DEFAULT_USER_ID = "0";

/**
 * GET /api/trades/assets
 * 자산 스냅샷 조회 (기간별)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "1M"; // 1W, 1M, 3M, 1Y, ALL

    // 기간 계산
    const now = new Date();
    let startDate: Date | null = null;

    switch (period) {
      case "1W":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "1M":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3M":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1Y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "ALL":
      default:
        startDate = null;
    }

    const conditions = [eq(assetSnapshots.userId, DEFAULT_USER_ID)];
    if (startDate) {
      conditions.push(gte(assetSnapshots.date, startDate));
    }

    const snapshots = await db
      .select({
        date: assetSnapshots.date,
        totalAssets: assetSnapshots.totalAssets,
        cash: assetSnapshots.cash,
        positionValue: assetSnapshots.positionValue,
      })
      .from(assetSnapshots)
      .where(and(...conditions))
      .orderBy(assetSnapshots.date);

    return NextResponse.json(
      snapshots.map((s) => ({
        date: s.date,
        totalAssets: parseFloat(s.totalAssets),
        cash: parseFloat(s.cash),
        positionValue: parseFloat(s.positionValue),
      }))
    );
  } catch (error) {
    console.error("Failed to fetch asset snapshots:", error);
    return NextResponse.json(
      { error: "자산 스냅샷 조회 실패" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trades/assets
 * 자산 스냅샷 저장/업데이트
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, totalAssets, cash, positionValue } = body;

    if (!date || totalAssets == null || cash == null || positionValue == null) {
      return NextResponse.json(
        { error: "date, totalAssets, cash, positionValue 필수" },
        { status: 400 }
      );
    }

    const snapshotDate = new Date(date);
    snapshotDate.setHours(0, 0, 0, 0);

    // upsert
    await db
      .insert(assetSnapshots)
      .values({
        userId: DEFAULT_USER_ID,
        date: snapshotDate,
        totalAssets: totalAssets.toString(),
        cash: cash.toString(),
        positionValue: positionValue.toString(),
      })
      .onConflictDoUpdate({
        target: [assetSnapshots.userId, assetSnapshots.date],
        set: {
          totalAssets: totalAssets.toString(),
          cash: cash.toString(),
          positionValue: positionValue.toString(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save asset snapshot:", error);
    return NextResponse.json(
      { error: "자산 스냅샷 저장 실패" },
      { status: 500 }
    );
  }
}
