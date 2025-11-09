# Tasks: 테이블에 PEG 및 PER 컬럼 추가

**Input**: Design documents from `/specs/table-peg-per-columns/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: 테스트는 각 User Story별로 포함됩니다.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 프로젝트 구조 확인 및 브랜치 생성

- [x] T001 브랜치 생성: `feature/table-peg-per-columns`
- [x] T002 [P] 현재 코드베이스 구조 파악 및 영향 범위 분석
- [x] T003 [P] quarterly_ratios 테이블의 pe_ratio와 peg_ratio 데이터 확인

---

## Phase 2: User Story 1 - PER 컬럼 추가 (Priority: P1) 🎯 MVP

**Goal**: 테이블에 PER(Price-to-Earnings Ratio) 컬럼을 추가하여 각 종목의 PER 값을 표시

**Independent Test**: PER 컬럼이 올바르게 표시되고, 데이터가 없는 경우 "-"로 표시되는지 확인

### Tests for User Story 1

- [ ] T010 [P] [US1] API 응답에 PER 데이터 포함 테스트 추가: `src/app/api/screener/golden-cross/__tests__/route.test.ts`
- [ ] T011 [P] [US1] PER 포맷팅 함수 테스트 작성: `src/lib/__tests__/format-ratio.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] API 엔드포인트에 quarterly_ratios JOIN 추가: `src/app/api/screener/golden-cross/route.ts`
  - quarterly_ratios 테이블과 LATERAL JOIN
  - 최신 분기의 pe_ratio 가져오기
  - 응답에 pe_ratio 포함
- [x] T013 [US1] 타입 정의에 PER 필드 추가: `src/types/golden-cross.ts`
  - `GoldenCrossCompany` 인터페이스에 `pe_ratio: number | null` 추가
- [x] T014 [US1] 테이블에 PER 컬럼 추가: `src/app/screener/golden-cross/GoldenCrossClient.tsx`
  - TableHeader에 PER 컬럼 헤더 추가
  - TableBody에 PER 값 표시
  - 포맷팅 함수 구현 (소수점 2자리, null 처리)

**Checkpoint**: PER 컬럼이 테이블에 표시되고, 값이 올바르게 포맷되어 표시됨

---

## Phase 3: User Story 2 - PEG 컬럼 추가 (Priority: P1)

**Goal**: 테이블에 PEG(Price/Earnings to Growth Ratio) 컬럼을 추가하여 각 종목의 PEG 값을 표시

**Independent Test**: PEG 컬럼이 올바르게 표시되고, 데이터가 없는 경우 "-"로 표시되는지 확인

### Tests for User Story 2

- [ ] T020 [P] [US2] API 응답에 PEG 데이터 포함 테스트 추가: `src/app/api/screener/golden-cross/__tests__/route.test.ts`
- [ ] T021 [P] [US2] PEG 포맷팅 함수 테스트 작성: `src/lib/__tests__/format-ratio.test.ts`

### Implementation for User Story 2

- [x] T022 [US2] API 엔드포인트에 PEG 데이터 추가: `src/app/api/screener/golden-cross/route.ts`
  - quarterly_ratios JOIN에서 peg_ratio도 함께 가져오기
  - 응답에 peg_ratio 포함
- [x] T023 [US2] 타입 정의에 PEG 필드 추가: `src/types/golden-cross.ts`
  - `GoldenCrossCompany` 인터페이스에 `peg_ratio: number | null` 추가
- [x] T024 [US2] 테이블에 PEG 컬럼 추가: `src/app/screener/golden-cross/GoldenCrossClient.tsx`
  - TableHeader에 PEG 컬럼 헤더 추가
  - TableBody에 PEG 값 표시
  - 포맷팅 함수 활용 (PER과 동일한 로직)

**Checkpoint**: PEG 컬럼이 테이블에 표시되고, 값이 올바르게 포맷되어 표시됨

---

## Phase 4: 통합 및 마무리

**Purpose**: 모든 기능 통합 및 최종 검증

- [x] T040 [P] 모든 기존 테스트 케이스 통과 확인
- [ ] T041 [P] 새로운 테스트 케이스 통과 확인 (향후 추가 예정)
- [x] T042 [P] 테이블 레이아웃 및 반응형 확인
- [x] T043 [P] 데이터가 없는 경우 처리 확인 (formatRatio 함수로 "-" 표시)
- [x] T044 코드 리뷰 및 리팩토링
- [x] T045 빌드 및 배포 테스트
  - 빌드 성공 확인
  - 린터 에러 없음
- [x] T046 PER/PEG 컬럼 위치 조정 (종가와 매출 사이로 이동)
- [x] T047 테이블 헤더 한글화 (Symbol → 종목, Market Cap → 시가총액, Last Close → 종가)
- [x] T048 레이아웃 쉬프트 방지 (스켈레톤과 실제 테이블 구조 일치)
- [x] T049 데이터 변환 로직 개선 (PostgreSQL numeric 타입 처리)
- [x] T050 TableSkeleton.tsx 업데이트 (MA 컬럼 제거, 새로운 구조 반영)
- [x] T051 PEG 필터 추가 (성장성 필터 내부)
  - FilterState 타입에 pegFilter 추가
  - API 라우트에 pegFilter 파라미터 및 SQL 조건 추가 (0 <= PEG < 1, 음수 제외)
  - GrowthFilterControls에 PEG 필터 UI 추가
  - CategoryFilterDialog에서 PEG 필터 상태 관리
  - GoldenCrossClient에서 PEG 필터 URL 파라미터 연결
  - getGrowthFilterSummary에 PEG 필터 요약 추가

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup completion - MVP 기능
- **User Story 2 (Phase 3)**: Depends on User Story 1 completion - PER과 유사한 구조
- **Polish (Phase 4)**: Depends on all user stories completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup - No dependencies on other stories
- **User Story 2 (P1)**: Depends on User Story 1 - PER과 동일한 패턴으로 구현

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- API 변경 후 프론트엔드 변경
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel
- Tests for a user story marked [P] can run in parallel
- User Story 1의 테스트와 구현은 순차적으로 진행

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 1 (PER 컬럼 추가)
3. **STOP and VALIDATE**: PER 컬럼이 정상 작동하는지 확인
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Final polish and compatibility → Deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- 기존 테이블 기능은 모두 유지하며, 새로운 컬럼만 추가
- quarterly_ratios 테이블에 이미 데이터가 존재하므로 추가 ETL 작업 불필요
