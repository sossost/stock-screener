import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { deviceTokens } from "@/db/schema";

/**
 * POST /api/notifications/register-device
 * 디바이스 토큰 등록/업데이트 API
 * - 모바일 앱에서 푸시 알림 토큰을 등록하거나 업데이트
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pushToken, deviceId, platform } = body;

    console.log("📥 Register device request:", {
      pushToken: pushToken?.substring(0, 20) + "...",
      deviceId,
      platform,
    });

    // 입력 검증
    if (!pushToken || !deviceId || !platform) {
      console.error("❌ Missing required fields:", {
        hasPushToken: !!pushToken,
        hasDeviceId: !!deviceId,
        hasPlatform: !!platform,
      });
      return NextResponse.json(
        { error: "pushToken, deviceId, platform 필수" },
        { status: 400 }
      );
    }

    if (platform !== "ios" && platform !== "android") {
      console.error("❌ Invalid platform:", platform);
      return NextResponse.json(
        { error: "platform은 'ios' 또는 'android'여야 함" },
        { status: 400 }
      );
    }

    // 기존 토큰 업데이트 또는 새로 생성
    console.log("💾 Inserting/updating device token...");
    await db
      .insert(deviceTokens)
      .values({
        deviceId,
        pushToken,
        platform,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: deviceTokens.deviceId,
        set: {
          pushToken,
          platform,
          isActive: true,
          updatedAt: new Date(),
        },
      });

    console.log("✅ Device token registered successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Failed to register device:", error);
    if (error instanceof Error) {
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      return NextResponse.json(
        {
          error: "Failed to register device",
          details: error.message,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to register device",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
