# Tasks: 테이블에 섹터 컬럼 추가

**Input**: Design documents from `/specs/table-sector-column/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: User Story별로 필요한 테스트를 포함한다(새 파일 생성 가능).  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 브랜치/환경 준비 및 영향 범위 확인

- [ ] T001 브랜치 생성: `feature/table-sector-column`
- [ ] T002 [P] 섹터 데이터 소스 확인(`apps/web/src/db/schema.ts`, `apps/web/src/etl/jobs/load-nasdaq-symbols.ts`) 및 null 비율 파악
- [ ] T003 [P] 스크리너 테이블/정렬 구조 파악(`apps/web/src/components/screener/StockTable.tsx`, `columns.ts`)

---

## Phase 2: User Story 1 - 섹터 컬럼 표시 (Priority: P1) 🎯 MVP

**Goal**: API/타입/테이블에 섹터 컬럼을 추가해 값을 표시하고, 값이 없으면 "-"를 보여준다.  
**Independent Test**: API 응답에 `sector` 필드가 포함되고, UI에서 값/빈값이 올바르게 렌더링되는지 확인.

### Tests for User Story 1

- [ ] T010 [P] [US1] API 응답에 `sector` 포함 여부 테스트 추가/보강: `apps/web/src/app/api/screener/golden-cross/__tests__/route.test.ts`
- [ ] T011 [P] [US1] 테이블 렌더링 테스트 추가(섹터 값/“-” 확인): `apps/web/src/components/screener/__tests__/StockTable.test.tsx` (신규)

### Implementation for User Story 1

- [ ] T012 [US1] Golden Cross 쿼리에 `symbols.sector` 선택 및 응답 매핑 추가: `apps/web/src/app/api/screener/golden-cross/route.ts`
- [ ] T013 [US1] 타입 정의에 `sector: string | null` 추가: `apps/web/src/types/golden-cross.ts`
- [ ] T014 [US1] 섹터 컬럼 메타 추가(레이블/폭/툴팁): `apps/web/src/components/screener/columns.ts`
- [ ] T015 [US1] 테이블 셀 렌더링에 섹터 표시/“-” 처리 추가: `apps/web/src/components/screener/StockTable.tsx`
- [ ] T016 [US1] 스켈레톤/캡션 등 레이아웃 확인(`apps/web/src/app/(screener)/TableSkeleton.tsx`는 컬럼 배열 사용 여부 확인)

**Checkpoint**: API 응답에 `sector`가 포함되고, 테이블에서 섹터가 올바르게 표시된다.

---

## Phase 3: User Story 2 - 섹터 기준 정렬 (Priority: P2)

**Goal**: 섹터 헤더 클릭 시 오름/내림차순 정렬을 지원하고 null 값은 뒤로 보낸다.  
**Independent Test**: 섹터 헤더 클릭으로 정렬 방향이 토글되고, null/빈 값은 마지막에 배치되는지 확인.

### Tests for User Story 2

- [ ] T020 [P] [US2] 정렬 로직 테스트 추가(섹터 알파벳/한글 정렬, null 뒤로): `apps/web/src/components/screener/__tests__/StockTable.test.tsx`

### Implementation for User Story 2

- [ ] T022 [US2] `SortKey`에 `sector` 추가, 기본 정렬(`market_cap`) 유지: `apps/web/src/components/screener/columns.ts`
- [ ] T023 [US2] 정렬 스위치에 `sector` 케이스 추가(null 뒤로 처리): `apps/web/src/components/screener/StockTable.tsx`
- [ ] T024 [US2] 섹터 헤더 클릭 가능/아이콘 표기 확인(tooltip 필요 시 추가): `apps/web/src/components/screener/columns.ts`

**Checkpoint**: 섹터 컬럼 정렬이 토글/작동하며 기존 기본 정렬은 변화 없음.

---

## Phase 4: User Story 3 - 섹터 필터 (Priority: P3, NEEDS CLARIFICATION)

**Goal**: 선택한 섹터만 표시하도록 필터링(단일/다중 선택 확인 필요)하고 쿼리 파라미터/요약에 반영한다.  
**Independent Test**: 섹터 선택 후 해당 섹터만 남고, 새로고침 시 동일 필터가 유지된다.

### Tests for User Story 3

- [ ] T030 [P] [US3] 필터 스키마 파서/빌더 테스트 추가(섹터 파라미터): `apps/web/src/lib/filters/__tests__/schema.test.ts` (신규)
- [ ] T031 [P] [US3] 필터 요약에 섹터 선택 반영 테스트: `apps/web/src/lib/filters/__tests__/summary.test.ts` (신규)

### Implementation for User Story 3

- [ ] T032 [US3] 필터 상태/타입에 섹터 필드 추가(단일/다중 선택 결정): `apps/web/src/lib/filters/summary.ts`, `apps/web/src/hooks/useFilterState.ts`
- [ ] T033 [US3] 섹터 쿼리 파라미터 파싱/빌드/캐시 태그 반영: `apps/web/src/lib/filters/schema.ts`
- [ ] T034 [US3] 섹터 필터 UI 추가(카테고리 선택/라벨/리셋): `apps/web/src/components/filters/CategoryFilterDialog.tsx`, `CategoryFilterBox` 관련 파일
- [ ] T035 [US3] API에서 섹터 파라미터 적용(`symbols.sector` 기준 필터링) 및 유효성 검증: `apps/web/src/app/api/screener/golden-cross/route.ts`

**Checkpoint**: 섹터 필터가 URL/요약에 반영되고 선택된 섹터만 결과에 포함된다.

---

## Phase 5: 통합 및 마무리

- [ ] T040 `yarn test` 실행(필요 시 `yarn build` 포함) 및 결과 기록
- [ ] T041 테이블 레이아웃/반응형 확인(긴 섹터명 포함) 및 툴팁/트렁케이션 검토
- [ ] T042 문서/가이드 필요 시 업데이트(`spec.md` 반영 여부 점검)

