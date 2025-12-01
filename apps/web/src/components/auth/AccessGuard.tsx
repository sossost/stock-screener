"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ACCESS_CODE_STORAGE_KEY = "screener_access_code";

async function registerAccessCode(code: string): Promise<boolean> {
  try {
    const res = await fetch("/api/access-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    return res.ok;
  } catch {
    // 네트워크 에러 시에도 실패로 처리
    return false;
  }
}

type AccessGuardProps = {
  children: React.ReactNode;
};

/**
 * 전체 앱에 대한 접근 코드 가드
 * - 최초 진입 시 로컬스토리지에 저장된 코드가 없으면 화면을 블락하고 코드 입력 UI 표시
 * - 유효한 코드를 입력하면 로컬스토리지에 저장 후 통과
 * - 이후에는 자동으로 통과 (서버에는 /api/access-code 로 코드 전달해 userId 매핑에 사용 예정)
 */
export function AccessGuard({ children }: AccessGuardProps) {
  const [accessCode, setAccessCode] = useState<string>("");
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(ACCESS_CODE_STORAGE_KEY);
    if (!stored || stored.trim().length === 0) {
      setIsChecking(false);
      return;
    }

    const trimmed = stored.trim();
    setIsChecking(true);

    // 저장된 코드도 서버에서 유효성 검증
    registerAccessCode(trimmed)
      .then((ok) => {
        if (ok) {
          setAccessCode(trimmed);
          setHasAccess(true);
        } else {
          window.localStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
          setHasAccess(false);
        }
      })
      .finally(() => setIsChecking(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = accessCode.trim();

    if (!trimmed) {
      setError("접근 코드를 입력해 주세요.");
      return;
    }

    setError(null);

    const ok = await registerAccessCode(trimmed);
    if (!ok) {
      setError("유효하지 않은 접근 코드입니다.");
      window.localStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
      setHasAccess(false);
      return;
    }

    window.localStorage.setItem(ACCESS_CODE_STORAGE_KEY, trimmed);
    setHasAccess(true);
  };

  // 초기 체크 중에는 아무것도 렌더링하지 않음 (레이아웃 깜빡임 방지)
  if (isChecking) {
    return null;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              접근 코드가 필요한 개인용 서비스입니다
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              이 프로젝트는 개인적인 사용을 위해 만들어진 주식 스크리너입니다.
              접근 코드를 입력해야만 서비스를 사용할 수 있습니다.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="접근 코드"
                className="h-10"
                autoFocus
              />
              {error && (
                <p className="text-xs text-red-500" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full h-10">
                코드로 입장하기
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
