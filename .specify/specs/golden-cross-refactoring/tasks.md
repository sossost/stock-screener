# Tasks: 주식 스크리너 리팩토링

**Input**: Design documents from `/specs/golden-cross-refactoring/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: 각 User Story별로 테스트 포함

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 0: 이름 변경 (선택적)

**Purpose**: 폴더명과 컴포넌트명을 실제 기능에 맞게 변경

- [ ] T000 폴더명 변경: `src/app/screener/golden-cross/` → `src/app/screener/main/`
- [ ] T001 컴포넌트명 변경: `GoldenCrossClient` → `ScreenerClient`
- [ ] T002 타입명 변경: `GoldenCrossCompany` → `ScreenerCompany`, `GoldenCrossClientProps` → `ScreenerClientProps`
- [ ] T003 파일명 변경: `GoldenCrossClient.tsx` → `ScreenerClient.tsx`
- [ ] T004 모든 import 경로 업데이트
- [ ] T005 테스트 및 빌드 확인

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 리팩토링 준비 및 브랜치 생성

- [x] T010 브랜치 생성: `feature/golden-cross-refactoring`
- [x] T011 [P] 현재 코드베이스 구조 파악 및 영향 범위 분석
- [ ] T012 [P] 기존 테스트 케이스 확인 및 백업

---

## Phase 2: User Story 1 - 타입 정의 및 포맷팅 함수 분리 (Priority: P1) 🎯 MVP

**Goal**: 타입 정의와 포맷팅 함수를 컴포넌트 파일에서 분리하여 재사용성 향상

**Independent Test**: 타입 정의가 `src/types/screener.ts` (또는 `golden-cross.ts`)에 있고, 포맷팅 함수가 `src/utils/format.ts`에 있으며, `ScreenerClient.tsx`에서 정상적으로 import되어 사용되는지 확인

### Tests for User Story 1

- [ ] T010 [P] [US1] 타입 정의 import 테스트: `src/app/screener/golden-cross/__tests__/types.test.ts`
- [ ] T011 [P] [US1] 포맷팅 함수 테스트: `src/utils/__tests__/format.test.ts`

### Implementation for User Story 1

- [ ] T012 [US1] 타입 정의 추출: `src/app/screener/golden-cross/GoldenCrossClient.tsx` (또는 `ScreenerClient.tsx`)
  - `QuarterlyFinancial` 타입 추출 (37-42줄)
  - `GoldenCrossCompany` 타입 추출 (44-58줄)
  - `GoldenCrossClientProps` 타입 추출 (60-63줄)
- [ ] T013 [US1] 타입 정의 통합: `src/types/screener.ts` (또는 `golden-cross.ts` 유지)
  - 기존 타입과 통합
  - 중복 제거
  - Export 설정
- [ ] T014 [US1] 포맷팅 함수 추출: `src/app/screener/golden-cross/GoldenCrossClient.tsx`
  - `formatQuarter` 함수 추출 (65-76줄)
  - `formatRatio` 함수 추출 (97-105줄)
  - `prepareChartData` 함수 추출 (78-95줄) → `src/utils/chart-data.ts`로 이동
- [ ] T015 [US1] 포맷팅 함수 통합
  - `formatQuarter`, `formatRatio` → `src/utils/format.ts`
  - `prepareChartData` → `src/utils/chart-data.ts` (새 파일)
  - Export 설정
- [ ] T016 [US1] 컴포넌트에서 import 경로 업데이트: `src/app/screener/golden-cross/GoldenCrossClient.tsx` (또는 `ScreenerClient.tsx`)
  - 타입 import 경로 수정
  - 포맷팅 함수 import 경로 수정
- [ ] T017 [US1] 테스트 및 빌드 확인
  - 모든 테스트 통과 확인
  - 빌드 성공 확인
  - 기능 정상 작동 확인

**Checkpoint**: 타입 정의와 포맷팅 함수가 분리되고 컴포넌트에서 정상적으로 사용됨

---

## Phase 3: User Story 2 - 필터 상태 관리 커스텀 훅 분리 (Priority: P1) 🎯 MVP

**Goal**: 필터 상태 관리 로직을 커스텀 훅으로 분리하여 재사용성 및 테스트 가능성 향상

**Independent Test**: `useFilterState` 훅이 모든 필터 상태를 관리하고, `ScreenerClient.tsx`에서 정상적으로 사용되는지 확인

### Tests for User Story 2

- [ ] T020 [P] [US2] 필터 상태 관리 훅 테스트: `src/hooks/__tests__/useFilterState.test.ts`

### Implementation for User Story 2

- [ ] T021 [US2] 필터 상태 관리 훅 생성: `src/hooks/useFilterState.ts`
  - 모든 `useQueryState` 로직 포함 (11개)
    - 이평선: ordered, goldenCross, justTurned, lookbackDays
    - 수익성: profitability
    - 성장성: revenueGrowth, revenueGrowthQuarters, revenueGrowthRate, incomeGrowth, incomeGrowthQuarters, incomeGrowthRate
    - PEG: pegFilter
  - 필터 상태 타입 정의
  - 필터 상태 조작 메서드 제공
- [ ] T022 [US2] 컴포넌트에서 훅 사용: `src/app/screener/golden-cross/GoldenCrossClient.tsx` (또는 `ScreenerClient.tsx`)
  - 기존 `useQueryState` 제거
  - `useFilterState` 훅 사용
  - 필터 상태 접근 경로 업데이트
- [ ] T023 [US2] 테스트 및 빌드 확인
  - 모든 테스트 통과 확인
  - 빌드 성공 확인
  - 필터 기능 정상 작동 확인

**Checkpoint**: 필터 상태 관리가 훅으로 분리되고 컴포넌트에서 정상적으로 사용됨

---

## Phase 4: User Story 3 - 티커 검색 로직 커스텀 훅 분리 (Priority: P2)

**Goal**: 티커 검색 관련 로직을 커스텀 훅으로 분리하여 재사용성 향상

**Independent Test**: `useTickerSearch` 훅이 debounce와 useDeferredValue를 포함하여 검색 로직을 관리하고, `ScreenerClient.tsx`에서 정상적으로 사용되는지 확인

### Tests for User Story 3

- [ ] T030 [P] [US3] 티커 검색 훅 테스트: `src/hooks/__tests__/useTickerSearch.test.ts`

### Implementation for User Story 3

- [ ] T031 [US3] 티커 검색 훅 생성: `src/hooks/useTickerSearch.ts`
  - 검색 입력값 상태 관리 (tickerSearchInput, tickerSearch)
  - Debounce 로직 (useEffect, 300ms, startTransition)
  - useDeferredValue 최적화
  - 필터링된 데이터 반환 (useMemo)
- [ ] T032 [US3] 컴포넌트에서 훅 사용: `src/app/screener/golden-cross/GoldenCrossClient.tsx` (또는 `ScreenerClient.tsx`)
  - 기존 티커 검색 로직 제거
  - `useTickerSearch` 훅 사용
- [ ] T033 [US3] 테스트 및 빌드 확인
  - 모든 테스트 통과 확인
  - 빌드 성공 확인
  - 티커 검색 기능 정상 작동 확인

**Checkpoint**: 티커 검색 로직이 훅으로 분리되고 컴포넌트에서 정상적으로 사용됨

---

## Phase 5: User Story 4 - 필터 액션 커스텀 훅 분리 (Priority: P2)

**Goal**: 필터 변경, 적용, 초기화 로직을 커스텀 훅으로 분리하여 재사용성 향상

**Independent Test**: `useFilterActions` 훅이 필터 변경, 적용, 초기화 로직을 관리하고, `ScreenerClient.tsx`에서 정상적으로 사용되는지 확인

### Tests for User Story 4

- [ ] T040 [P] [US4] 필터 액션 훅 테스트: `src/hooks/__tests__/useFilterActions.test.ts`

### Implementation for User Story 4

- [ ] T041 [US4] 필터 액션 훅 생성: `src/hooks/useFilterActions.ts`
  - `handleFilterChange` 로직 (12개 파라미터)
  - `handleFilterApply` 로직 (Partial<FilterState>)
  - `handleFilterReset` 로직 (카테고리별)
  - 캐시 무효화 로직
  - URL 업데이트 및 리패치 로직
- [ ] T042 [US4] 컴포넌트에서 훅 사용: `src/app/screener/golden-cross/GoldenCrossClient.tsx` (또는 `ScreenerClient.tsx`)
  - 기존 필터 액션 함수 제거
  - `useFilterActions` 훅 사용
- [ ] T043 [US4] 테스트 및 빌드 확인
  - 모든 테스트 통과 확인
  - 빌드 성공 확인
  - 필터 액션 기능 정상 작동 확인

**Checkpoint**: 필터 액션이 훅으로 분리되고 컴포넌트에서 정상적으로 사용됨

---

## Phase 6: User Story 5 - 테이블 컴포넌트 분리 (Priority: P3)

**Goal**: 테이블 렌더링 로직을 별도 컴포넌트로 분리하여 재사용성 향상

**Independent Test**: `StockTable` 컴포넌트가 테이블 렌더링을 담당하고, `ScreenerClient.tsx`에서 정상적으로 사용되는지 확인

### Tests for User Story 5

- [ ] T050 [P] [US5] 테이블 컴포넌트 테스트: `src/components/screener/__tests__/StockTable.test.tsx`

### Implementation for User Story 5

- [ ] T051 [US5] 테이블 컴포넌트 생성: `src/components/screener/StockTable.tsx`
  - 테이블 헤더
  - 테이블 바디
  - 테이블 캡션 (필터 요약)
  - 빈 상태 메시지
- [ ] T052 [US5] 컴포넌트에서 사용: `src/app/screener/golden-cross/GoldenCrossClient.tsx` (또는 `ScreenerClient.tsx`)
  - 기존 테이블 렌더링 로직 제거
  - `StockTable` 컴포넌트 사용
- [ ] T053 [US5] 테스트 및 빌드 확인
  - 모든 테스트 통과 확인
  - 빌드 성공 확인
  - 테이블 렌더링 정상 작동 확인

**Checkpoint**: 테이블 렌더링이 컴포넌트로 분리되고 정상적으로 사용됨

---

## Phase 7: 통합 및 마무리

**Purpose**: 모든 리팩토링 통합 및 최종 검증

- [ ] T060 [P] 모든 기존 테스트 케이스 통과 확인
- [ ] T061 [P] 새로운 테스트 케이스 통과 확인
- [ ] T062 [P] `ScreenerClient.tsx` 파일 크기 확인 (300줄 이하)
- [ ] T063 [P] 코드 리뷰 및 최종 리팩토링
- [ ] T064 [P] README 업데이트 (리팩토링 내용 반영)
- [ ] T065 사용자 확인 대기 (빌드 및 배포 테스트, 커밋은 사용자가 직접 수행)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup completion - MVP 기능
- **User Story 2 (Phase 3)**: Depends on User Story 1 completion
- **User Story 3 (Phase 4)**: Depends on User Story 2 completion
- **User Story 4 (Phase 5)**: Depends on User Story 3 completion
- **User Story 5 (Phase 6)**: Depends on User Story 4 completion
- **Polish (Phase 7)**: Depends on all User Stories completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup - No dependencies on other stories
- **User Story 2 (P1)**: Depends on User Story 1 (타입 정의 필요)
- **User Story 3 (P2)**: Depends on User Story 2 (필터 상태 필요)
- **User Story 4 (P2)**: Depends on User Story 3 (필터 상태 및 검색 필요)
- **User Story 5 (P3)**: Depends on User Story 4 (모든 필터 로직 필요)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel
- Tests for a user story marked [P] can run in parallel
- User Story 1의 테스트와 구현은 순차적으로 진행

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 1 (타입 정의 및 포맷팅 함수 분리)
3. Complete Phase 3: User Story 2 (필터 상태 관리 훅 분리)
4. **STOP and VALIDATE**: 리팩토링이 정상 작동하는지 확인
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup → Foundation ready
2. Add User Story 1 → Test independently
3. Add User Story 2 → Test independently
4. Add User Story 3 → Test independently
5. Add User Story 4 → Test independently
6. Add User Story 5 → Test independently
7. Final polish and compatibility

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Stop at any checkpoint to validate story independently
- 리팩토링 중에도 기존 기능이 정상 작동해야 함
- 각 단계마다 테스트 및 빌드 확인 필수
- 점진적 리팩토링으로 안정성 보장
