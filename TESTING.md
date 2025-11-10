# 테스트 가이드

## 테스트 환경 설정

이 프로젝트는 **Vitest**를 사용하여 테스트를 작성합니다. 웹앱 소스와 테스트는 `apps/web` 아래에 있으며, 루트에서 `yarn test`를 실행해도 `apps/web` 워크스페이스가 실행됩니다.

### 설치된 패키지

- `vitest`: 테스트 러너
- `@testing-library/react`: React 컴포넌트 테스트
- `@testing-library/jest-dom`: DOM 매처
- `@testing-library/user-event`: 사용자 이벤트 시뮬레이션
- `jsdom`: 브라우저 환경 시뮬레이션

## 테스트 실행

```bash
# 모든 테스트 실행
yarn test

# Watch 모드 (파일 변경 시 자동 실행)
yarn test:watch

# UI 모드 (브라우저에서 결과 확인)
yarn test:ui

# 커버리지 확인
yarn test:coverage

# 특정 테스트 파일만 실행
yarn test src/lib/__tests__/growth-rate.test.ts
```

## 테스트 구조

### 단위 테스트

- **경로**: `apps/web/src/lib/__tests__/`
- **목적**: 순수 함수 및 유틸리티 로직 테스트
- **예시**: `growth-rate.test.ts` - 성장률 계산 로직

### API 테스트

- **경로**: `apps/web/src/app/api/**/__tests__/`
- **목적**: API 엔드포인트 검증
- **예시**: `route.test.ts` - Golden Cross API 파라미터 검증

### 컴포넌트 테스트

- **경로**: `apps/web/src/components/**/__tests__/`
- **목적**: React 컴포넌트 동작 검증
- **예시**: `GrowthFilterControls.test.tsx` - 필터 UI 동작

## 테스트 작성 가이드

### 1. 성장률 계산 로직 테스트

```typescript
import { describe, it, expect } from "vitest";
import { calculateAverageGrowthRate } from "@/lib/growth-rate";

describe("calculateAverageGrowthRate", () => {
  it("정상적인 평균 성장률 계산", () => {
    const quarters = [
      { period_end_date: "2024-12-31", value: 150 },
      { period_end_date: "2024-09-30", value: 130 },
      // ...
    ];
    const result = calculateAverageGrowthRate(quarters, 4);
    expect(result).toBeCloseTo(14.52, 1);
  });
});
```

### 2. API 라우트 테스트

```typescript
import { describe, it, expect, vi } from "vitest";
import { GET } from "../route";

vi.mock("@/db/client", () => ({
  db: { execute: vi.fn() },
}));

describe("GET /api/screener/golden-cross", () => {
  it("파라미터 검증", async () => {
    const request = new Request("http://localhost:3000/api/screener/golden-cross?revenueGrowthRate=30");
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

### 3. React 컴포넌트 테스트

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { GrowthFilterControls } from "../GrowthFilterControls";

describe("GrowthFilterControls", () => {
  it("필터 활성화 시 입력 필드 활성화", () => {
    render(<GrowthFilterControls revenueGrowth={true} {...props} />);
    const input = screen.getByPlaceholderText("30");
    expect(input).not.toBeDisabled();
  });
});
```

## 테스트 커버리지 목표

- 핵심 비즈니스 로직: 90% 이상
- API 엔드포인트: 80% 이상
- React 컴포넌트: 70% 이상

## 테스트 작성 원칙

1. **TDD 원칙**: 테스트 작성 → 실패 확인 → 구현 → 통과 확인
2. **명확한 테스트 이름**: 무엇을 테스트하는지 명확하게
3. **독립적인 테스트**: 각 테스트는 독립적으로 실행 가능해야 함
4. **엣지 케이스 포함**: NULL, 0, 음수 등 특수 케이스 테스트
5. **Mock 사용**: 외부 의존성(DB, API)은 Mock으로 대체

## 주요 테스트 파일

- `apps/web/src/lib/__tests__/growth-rate.test.ts`: 성장률 계산 로직
- `apps/web/src/app/api/screener/golden-cross/__tests__/route.test.ts`: API 라우트
- `apps/web/src/components/filters/__tests__/GrowthFilterControls.test.tsx`: 필터 컴포넌트

## 문제 해결

### 테스트가 느린 경우

- Watch 모드에서 특정 파일만 실행
- 불필요한 Mock 제거
- 병렬 실행 확인 (`vitest.config.ts`)

### Mock이 작동하지 않는 경우

- `vi.mock`이 파일 상단에 있는지 확인
- `vi.clearAllMocks()`를 `beforeEach`에 추가

### 환경변수 문제

- `vitest.setup.ts`에서 환경변수 설정
- 각 테스트에서 필요한 환경변수만 설정
