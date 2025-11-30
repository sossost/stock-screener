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
- **UI 스타일**: `docs/FRONTEND_PRACTICES.md` 참고 (프론트엔드 품질 원칙)

## 컴포넌트 설계 원칙

### DRY (Don't Repeat Yourself)

- **반복되는 UI 패턴은 즉시 공용 컴포넌트로 추출**
- 2회 이상 사용되면 컴포넌트화 검토, 3회면 필수 추출

### 공용 UI 컴포넌트 (`src/components/ui/`)

| 컴포넌트     | 용도                    | 예시                        |
| ------------ | ----------------------- | --------------------------- |
| `Button`     | 모든 버튼 (shadcn 기반) | 액션, 제출, 링크 버튼       |
| `PageHeader` | 페이지 헤더             | 뒤로가기 + 타이틀 + 액션    |
| `FilterTabs` | 필터/탭 그룹            | 상태 필터, 카테고리 탭      |
| `EmptyState` | 빈 상태                 | 데이터 없음, 검색 결과 없음 |
| `ErrorState` | 에러 상태               | API 실패, 404               |

### 페이지 구조 패턴 (Next.js App Router)

```
/app/feature/
  ├── page.tsx           # 서버 컴포넌트 (metadata, Suspense)
  ├── FeatureClient.tsx  # 클라이언트 컴포넌트 ("use client")
  └── [id]/
      ├── page.tsx
      └── DetailClient.tsx
```

### 스켈레톤 작성 원칙

- 실제 렌더링과 **동일한 높이/레이아웃** 유지 (레이아웃 시프트 방지)
- `animate-pulse` 클래스 사용
- 실제 요소의 Tailwind 높이 클래스 참조 (text-lg → h-7 등)

## 테스트

- 스택: Vitest + Testing Library + JSDOM (`apps/web/vitest.setup.ts`).
- 위치: 단위 `src/lib/__tests__/`, API `src/app/api/**/__tests__/`, 컴포넌트 `src/components/**/__tests__/`.
- **피쳐 개발 시 테스트 코드 작성 필수** (새 로직/API/컴포넌트에 대해).
- 커버리지 목표: 로직 90% / API 80% / 컴포넌트 70%+.

## 구현 체크리스트 (코드 작성 시 필수)

코드 작성 전/중에 반드시 확인:

- [ ] **입력 검증**: API 파라미터, 사용자 입력에 대한 유효성 검사
- [ ] **에러 핸들링**: try-catch, 에러 응답, 폴백 처리
- [ ] **메모리 관리**: 이벤트 리스너, 구독, 타이머 cleanup 처리
- [ ] **배열/객체 접근**: 인덱스 범위 체크, null/undefined 가드
- [ ] **타입 안전성**: 타입 단언(as) 최소화, 타입 가드 사용
- [ ] **엣지 케이스**: 빈 배열, 단일 요소, 경계값 처리

## 피쳐 완료 체크리스트 (구현 후 필수)

"코드 완료" ≠ "피쳐 완료". 아래 모두 완료해야 피쳐 완료:

1. **셀프 리뷰**: 작성한 코드를 "PR 리뷰어 관점"으로 검토
   - **필수**: `docs/CODE_REVIEW_CHECKLIST.md` 체크리스트 전체 검증
   - 컴포넌트 설계 원칙, 타입 안전성, 에러 핸들링, UI/UX 안전성 확인
2. **UI 스타일 검토**: `docs/FRONTEND_PRACTICES.md` 기준으로 체크
3. **문서 업데이트**: README, spec, plan, tasks 동시 업데이트
4. **린트/테스트/빌드**: `yarn lint && yarn test && yarn build` 통과
5. **관련 단어 통일**: 코드/주석/문서에서 용어 일관성 확인

## 커밋/PR

- 커밋: `type: summary` (예: `feat: 티커 검색 필터 추가 (#8)`), 작업은 항상 별도 브랜치(`git checkout -b feature/<name>`).
- PR: 변경/이유/테스트 명령/연관 이슈/스키마·ETL 영향 명시.
- **커밋 전 필수 체크 (생략 불가)**:
  1. `yarn lint` 통과
  2. `yarn test` 통과
  3. `yarn build` 통과
  4. **사용자 승인 후 커밋** (승인 없이 커밋 금지)
- Git 원칙: 승인 없이 `git add/commit/branch/reset` 등 실행 금지. 반드시 먼저 확인/승인.

## 문서

- 가이드: `docs/FEATURE_DEVELOPMENT_WORKFLOW.md`, `docs/TESTING.md`, `docs/REFACTORING_REVIEW.md`, `docs/FRONTEND_PRACTICES.md`
- **품질 보증**: `docs/CODE_REVIEW_CHECKLIST.md` (코드 리뷰 필수), `docs/FEATURE_DEVELOPMENT_WORKFLOW.md` (3단계 검증 프로세스 포함)
- 스펙/플랜/태스크: `.specify/specs/<feature>/` (통합 템플릿은 필요 시 별도 관리)

## 보안/설정

- `apps/web/env.example`를 `.env.local`로 복사 후 값 설정, 비밀정보 커밋 금지. 필수 키: `FMP_API_KEY`, `DATABASE_URL`.
- Node 20.19+ 권장. 스키마 변경 후 `yarn db:push`, ETL/백필은 비프로덕션 데이터로 검증.
