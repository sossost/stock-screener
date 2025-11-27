# 리포지토리 가이드

## 프로젝트 구조
- 루트: 워크스페이스 오케스트레이션(`package.json`), 스펙/문서는 `.specify/specs/`, 공용 가이드는 `docs/`.
- `apps/web`: Next.js 15 앱. 라우트/API는 `src/app`, 전역 스타일 `src/app/globals.css`, UI/로직은 `src/components`, `src/lib`, `src/utils`, DB 스키마/ETL은 `src/db`, `src/etl`.
- `apps/mobile`: Expo 54 / RN 0.81. 엔트리 `apps/mobile/App.tsx`/`index.ts`, 설정 `app.json`, 에셋 `assets/`.
- `apps/web/drizzle`: 마이그레이션 산출물, 설정은 `drizzle.config.ts`.
- `apps/web/public`: 정적 에셋.
- 경로 별칭: `@/*` → `apps/web/src/*`.

## 빌드/테스트/개발 명령
- 루트: `yarn dev|lint|build|start|test|test:all`, `yarn dev:mobile`(Expo).
- `apps/web`: `yarn dev`, `yarn lint`, `yarn build`, `yarn start`, 테스트 `yarn test*`.
- ETL/DB: `yarn db:push`, `yarn etl:daily-prices`, `yarn etl:daily-ma`, `yarn etl:daily-ratios`(종가 기준 밸류에이션), `yarn etl:rs`/`rs-backfill`(12M/6M/3M 가중), `yarn etl:quarterly-financials`, `yarn etl:symbols`, `yarn etl:ratios`, `yarn etl:cleanup-invalid-symbols`.
- ETL 스케줄(GHA): 23:30 UTC(=KST 08:30) 단일 스케줄로 prices → MA/RS → ratios 순차 실행. 최신 일자 미충분 시 로그 확인 후 재실행.
- 모바일: `yarn dev:mobile`, `yarn workspace mobile ios/android`.

## 스타일/네이밍
- TypeScript strict, 컴포넌트/훅 PascalCase + `useX`.
- ESLint: `next/core-web-vitals` + `next/typescript`; PR 전 `npx eslint . --max-warnings=0`.
- `any` 지양, Tailwind + shadcn 패턴, 컴포넌트별 스타일/로직은 최대한 응집.

## 테스트
- 스택: Vitest + Testing Library + JSDOM (`apps/web/vitest.setup.ts`).
- 위치: 단위 `src/lib/__tests__/`, API `src/app/api/**/__tests__/`, 컴포넌트 `src/components/**/__tests__/`.
- **피쳐 개발 시 테스트 코드 작성 필수** (새 로직/API/컴포넌트에 대해).
- 커버리지 목표: 로직 90% / API 80% / 컴포넌트 70%+.

## 커밋/PR
- 커밋: `type: summary` (예: `feat: 티커 검색 필터 추가 (#8)`), 작업은 항상 별도 브랜치(`git checkout -b feature/<name>`).
- PR: 변경/이유/테스트 명령/연관 이슈/스키마·ETL 영향 명시.
- 리뷰 전 `yarn test` (런타임/설정 변경 시 `yarn build`도). 실패/스킵은 남김없이 공유.
- Git 원칙: 승인 없이 `git add/commit/branch/reset` 등 실행 금지. 반드시 먼저 확인/승인.

## 문서
- 가이드: `docs/FEATURE_DEVELOPMENT_WORKFLOW.md`, `docs/TESTING.md`, `docs/REFACTORING_REVIEW.md`
- 스펙/플랜/태스크: `.specify/specs/<feature>/` (통합 템플릿은 필요 시 별도 관리)

## 보안/설정
- `apps/web/env.example`를 `.env.local`로 복사 후 값 설정, 비밀정보 커밋 금지. 필수 키: `FMP_API_KEY`, `DATABASE_URL`.
- Node 20.19+ 권장. 스키마 변경 후 `yarn db:push`, ETL/백필은 비프로덕션 데이터로 검증.
