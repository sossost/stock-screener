import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { accessCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { USER_ID_COOKIE_NAME } from "@/lib/auth/user";

const ACCESS_CODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1년

type AccessCodeBody = {
  code?: string;
};

/**
 * POST /api/access-code
 * - 전달받은 접근 코드를 access_codes 테이블에서 조회
 * - 존재하는 코드에 한해서만 대응되는 userId를 httpOnly 쿠키에 저장
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AccessCodeBody;
    const rawCode = typeof body.code === "string" ? body.code : "";
    const code = rawCode.trim();

    if (!code) {
      return NextResponse.json(
        { error: "유효한 접근 코드가 필요합니다." },
        { status: 400 }
      );
    }

    const [record] = await db
      .select({ userId: accessCodes.userId })
      .from(accessCodes)
      .where(eq(accessCodes.code, code))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { error: "등록되지 않은 접근 코드입니다." },
        { status: 401 }
      );
    }

    const isProduction = process.env.NODE_ENV === "production";

    const response = NextResponse.json({ success: true });
    // 검증된 userId를 httpOnly 쿠키로 저장
    response.cookies.set(USER_ID_COOKIE_NAME, record.userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: ACCESS_CODE_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("Failed to verify access code:", error);
    return NextResponse.json(
      { error: "접근 코드 처리 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
