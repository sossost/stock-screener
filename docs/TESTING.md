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
