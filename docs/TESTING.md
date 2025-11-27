# 테스트 가이드

## 환경

이 프로젝트는 **Vitest** + Testing Library + jsdom을 사용합니다.

### 주요 패키지

- `vitest` (러너)
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- `jsdom`

## 실행

```bash
yarn test            # 전체
yarn test:watch      # 변경 감지
yarn test:ui         # UI 모드
yarn test:coverage   # 커버리지
yarn test path/to/file.test.ts  # 특정 파일
```

## 구조

- 단위: `src/lib/__tests__/`
- API: `src/app/api/**/__tests__/`
- 컴포넌트: `src/components/**/__tests__/`

## 커버리지 목표

- 로직 90% / API 80% / 컴포넌트 70%+

## 원칙

1. 실패 테스트 → 구현 → 통과
2. 명확한 이름
3. 독립 실행
4. 엣지 케이스 포함
5. 외부 의존성 Mock
6. **실제 코드 테스트** (인라인 로직 반복 금지)

## 테스트 가능한 설계

### ❌ 안티패턴: 인라인 로직 테스트

```typescript
// 테스트 내에서 로직을 직접 구현 → 실제 코드와 연결 안 됨
it("정배열", () => {
  const ordered = ma20 > ma50 && ma50 > ma100 && ma100 > ma200;
  expect(ordered).toBe(true);
});
```

### ✅ 올바른 패턴: 순수 함수 추출 후 테스트

```typescript
// lib/ma-status.ts - 순수 함수 추출
export function calculateMAStatus(ma20, ma50, ma100, ma200) { ... }

// __tests__/ma-status.test.ts - 실제 함수 import
import { calculateMAStatus } from "../ma-status";

it("정배열", () => {
  const result = calculateMAStatus(150, 140, 130, 120);
  expect(result.ordered).toBe(true);
});
```

### 원칙

- 비즈니스 로직은 **순수 함수**로 추출
- 테스트는 **실제 함수를 import**해서 실행
- DB/API 의존성이 있는 함수는 로직을 순수 함수로 분리
