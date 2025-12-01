import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

// 쿠키에는 검증된 userId만 저장한다.
export const USER_ID_COOKIE_NAME = "user_id";
export const DEFAULT_USER_ID = "0";

/**
 * 서버 컴포넌트/서버 유틸에서 현재 사용자 ID 조회 (쿠키 기반)
 */
export async function getUserIdFromCookies(): Promise<string> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_ID_COOKIE_NAME)?.value;
  const trimmed = userId?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_USER_ID;
}

/**
 * API Route(NextRequest)에서 현재 사용자 ID 조회 (쿠키 기반)
 */
export function getUserIdFromRequest(request: NextRequest): string {
  const userId = request.cookies.get(USER_ID_COOKIE_NAME)?.value;
  const trimmed = userId?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_USER_ID;
}
