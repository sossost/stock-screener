# Tasks: 티커 검색 필터

**Input**: Design documents from `/specs/ticker-search-filter/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: 테스트는 각 User Story별로 포함됩니다.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 프로젝트 구조 확인 및 브랜치 생성

- [x] T001 브랜치 생성: `feature/ticker-search-filter`
- [x] T002 [P] 현재 코드베이스 구조 파악 및 영향 범위 분석
- [x] T003 [P] shadcn/ui Input 컴포넌트 확인 및 사용법 파악

---

## Phase 2: User Story 1 - 티커 검색 필터 추가 (Priority: P1) 🎯 MVP

**Goal**: 검색 인풋을 추가하고 티커로 필터링하여 테이블에 결과 표시

**Independent Test**: 검색 인풋에 "NV"를 입력하면 "NV"가 포함된 심볼만 테이블에 표시되고, 검색어를 지우면 모든 종목이 다시 표시되는지 확인

### Tests for User Story 1

- [ ] T010 [P] [US1] 검색 인풋 렌더링 테스트 작성: `src/app/screener/golden-cross/__tests__/GoldenCrossClient.test.tsx` (선택적)
- [x] T011 [P] [US1] 티커 필터링 로직 테스트 작성: `src/lib/__tests__/filter-ticker.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] 검색 인풋 UI 추가: `src/app/screener/golden-cross/GoldenCrossClient.tsx`

  - shadcn/ui Input 컴포넌트 import
  - 필터박스 라인 오른쪽 끝에 검색 인풋 배치 (`ml-auto`, `h-12`, `w-[200px]`)
  - 플레이스홀더 텍스트 설정 ("티커 검색...")
  - 검색 아이콘 추가 (Search 아이콘, lucide-react)

- [x] T013 [US1] 검색어 상태 관리 및 최적화: `src/app/screener/golden-cross/GoldenCrossClient.tsx`

  - useState로 검색어 상태 관리 (`tickerSearchInput`, `tickerSearch` 분리)
  - Debounce(300ms) 적용
  - useDeferredValue로 필터링 우선순위 낮춤
  - startTransition으로 상태 업데이트 최적화

- [x] T014 [US1] 티커 필터링 함수 구현: `src/lib/filter-ticker.ts`

  - 검색어로 심볼 필터링하는 함수 작성 (`filterTickerData`)
  - 대소문자 구분 없이 부분 일치 검색
  - 빈 문자열일 때 모든 종목 반환

- [x] T015 [US1] 필터링된 결과를 테이블에 표시: `src/app/screener/golden-cross/GoldenCrossClient.tsx`

  - 필터링된 데이터를 테이블에 표시 (`filteredData` 사용)
  - 검색 결과가 없을 때 메시지 표시 ("검색 결과가 없습니다")
  - 테이블 캡션에 티커 검색어 표시

- [x] T016 [US1] 기존 필터와 통합: `src/app/screener/golden-cross/GoldenCrossClient.tsx`
  - 티커 검색 필터를 다른 필터(이평선, 성장성, 수익성)와 AND 조건으로 통합
  - 모든 필터 조건을 만족하는 종목만 표시
  - 검색 중일 때 스켈레톤 표시 방지 (`isPending && !tickerSearchInput && !tickerSearch`)

**Checkpoint**: 검색 인풋에 티커를 입력하면 필터링된 결과가 테이블에 표시되고, 검색어를 지우면 모든 종목이 다시 표시됨

---

## Phase 3: 통합 및 마무리

**Purpose**: 모든 기능 통합 및 최종 검증

- [x] T040 [P] 모든 기존 테스트 케이스 통과 확인
- [x] T041 [P] 새로운 테스트 케이스 통과 확인 (`src/lib/__tests__/filter-ticker.test.ts`)
- [x] T042 [P] 검색 인풋 UX 확인 (위치, 스타일, 반응성)
- [x] T043 [P] 대소문자 구분 없이 검색 작동 확인
- [x] T044 [P] 빈 문자열일 때 모든 종목 표시 확인
- [x] T045 [P] 다른 필터와 함께 사용 시 정상 작동 확인
- [x] T046 코드 리뷰 및 리팩토링
- [ ] T047 사용자 확인 대기 (빌드 및 배포 테스트, 커밋은 사용자가 직접 수행)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup completion - MVP 기능
- **Polish (Phase 3)**: Depends on User Story 1 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup - No dependencies on other stories

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- UI 추가 후 필터링 로직 구현
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
2. Complete Phase 2: User Story 1 (티커 검색 필터 추가)
3. **STOP and VALIDATE**: 검색 필터가 정상 작동하는지 확인
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup → Foundation ready
2. Add User Story 1 → Test independently → **사용자가 빌드/배포 테스트 및 커밋 수행**
3. Final polish and compatibility → **사용자가 빌드/배포 테스트 및 커밋 수행**

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- **⚠️ 중요: 빌드 테스트, 배포 테스트, 커밋은 사용자가 직접 수행합니다. AI는 구현만 담당합니다.**
- Stop at any checkpoint to validate story independently
- 기존 필터 기능은 모두 유지하며, 새로운 검색 필터만 추가
- 클라이언트 사이드 필터링이므로 서버 변경 불필요
- 검색 인풋 위치는 사용자 테스트 후 조정 가능
