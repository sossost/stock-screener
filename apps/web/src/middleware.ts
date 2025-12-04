import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 미들웨어: 기본 필터가 URL에 없으면 리다이렉트
 * - searchParams가 비어있을 때만 기본 필터(ordered, goldenCross, profitability)를 추가
 * - 로컬스토리지의 필터는 클라이언트에서 처리 (서버에서는 접근 불가)
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 홈 페이지(/)만 처리
  if (pathname !== "/") {
    return NextResponse.next();
  }

  // searchParams가 완전히 비어있을 때만 기본 필터 추가
  // 이미 파라미터가 있으면 (사용자가 설정한 필터가 있으면) 그대로 진행
  if (searchParams.toString().length > 0) {
    return NextResponse.next();
  }

  // searchParams가 비어있을 때만 기본 필터 추가하여 리다이렉트
  const newSearchParams = new URLSearchParams();
  newSearchParams.set("ordered", "true");
  newSearchParams.set("goldenCross", "true");
  newSearchParams.set("profitability", "profitable");

  const redirectUrl = new URL(request.url);
  redirectUrl.search = newSearchParams.toString();

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
