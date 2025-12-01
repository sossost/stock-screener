import { NextRequest } from "next/server";
import { randomUUID, randomBytes } from "crypto";

const SESSION_COOKIE_NAME = "watchlist_session_id";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1년

/**
 * UUID v4 생성 함수 (암호학적으로 안전한 랜덤 사용)
 */
function generateSessionId(): string {
  // Node.js 19+ 또는 지원되는 런타임에서는 crypto.randomUUID() 사용
  try {
    return randomUUID();
  } catch {
    // 폴백: crypto.randomBytes를 사용한 v4 UUID 생성
    const bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    
    return [
      bytes.toString("hex", 0, 4),
      bytes.toString("hex", 4, 6),
      bytes.toString("hex", 6, 8),
      bytes.toString("hex", 8, 10),
      bytes.toString("hex", 10, 16),
    ].join("-");
  }
}

/**
 * API 라우트에서 세션 ID 조회 또는 생성
 * @param request - NextRequest 객체
 * @returns 세션 ID
 */
export function getOrCreateSessionId(request: NextRequest): string {
  // API 라우트에서는 request.cookies 사용
  let sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    sessionId = generateSessionId();
  }

  return sessionId;
}

/**
 * 세션 ID를 쿠키에 설정하는 헤더 생성
 * @param sessionId - 세션 ID
 * @returns Set-Cookie 헤더 값
 */
export function createSessionCookie(sessionId: string): string {
  // 프로덕션 환경에서는 Secure 플래그 추가 (HTTPS 전용)
  const isProduction = process.env.NODE_ENV === "production";
  const secureFlag = isProduction ? "; Secure" : "";
  
  return `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; Max-Age=${SESSION_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secureFlag}`;
}
