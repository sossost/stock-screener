# Tasks: 골든크로스 필터 세분화 및 UX 개선

**Input**: Design documents from `/specs/golden-cross-filter-detailed/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: 테스트는 각 User Story별로 포함됩니다.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 프로젝트 구조 확인 및 브랜치 생성

- [x] T001 브랜치 생성: `feature/golden-cross-filter-detailed`
- [x] T002 [P] 현재 코드베이스 구조 파악 및 영향 범위 분석
- [x] T003 [P] 기존 테스트 실행하여 현재 상태 확인

---

## Phase 2: User Story 1 - 이평선 정배열 필터 토글 (Priority: P1) 🎯 MVP

**Goal**: 이평선 정배열(MA20 > MA50 > MA100 > MA200) 여부를 토글식으로 선택할 수 있는 필터 구현

**Independent Test**: 정배열 필터를 켜고 끄면서 결과가 달라지는지 확인

### Tests for User Story 1

- [ ] T010 [P] [US1] API 엔드포인트에 정배열 필터 파라미터 테스트 추가: `src/app/api/screener/golden-cross/__tests__/route.test.ts`
- [ ] T011 [P] [US1] 정배열 필터 로직 단위 테스트 작성: `src/lib/__tests__/ma-filter.test.ts`

### Implementation for User Story 1

- [ ] T012 [US1] API 엔드포인트에 정배열 필터 파라미터 추가: `src/app/api/screener/golden-cross/route.ts`
  - `ordered` 파라미터 파싱
  - SQL 쿼리에서 정배열 조건을 선택적으로 적용
  - 기존 `goldenCross` 파라미터와의 호환성 유지
- [ ] T013 [US1] 타입 정의 업데이트: `src/types/golden-cross.ts`
  - `MAFilterState` 타입 추가 (`ordered` 필드)
  - `GoldenCrossParams`에 정배열 필터 파라미터 추가
- [ ] T014 [US1] SQL 쿼리 로직 수정: `src/app/api/screener/golden-cross/route.ts`
  - 정배열 조건을 동적으로 추가하는 로직 구현
  - `ordered=true`일 때 MA20 > MA50 > MA100 > MA200 조건 적용

**Checkpoint**: 정배열 필터를 켜고 끄면서 결과가 정상적으로 변경됨

---

## Phase 3: User Story 2 - 골든크로스 필터 분리 (Priority: P1)

**Goal**: 골든크로스(MA50 > MA200) 조건을 별도 필터로 분리하고, 이평선 정배열 필터와 독립적으로 사용 가능하도록 구현

**Independent Test**: 골든크로스 필터를 켜고 끄면서 결과가 달라지는지, 그리고 이평선 정배열 필터와 조합하여 사용할 수 있는지 확인

### Tests for User Story 2

- [ ] T020 [P] [US2] 골든크로스 필터 독립 동작 테스트 추가: `src/app/api/screener/golden-cross/__tests__/route.test.ts`
- [ ] T021 [P] [US2] 골든크로스 필터와 이평선 필터 조합 테스트 추가

### Implementation for User Story 2

- [ ] T022 [US2] API 엔드포인트에 골든크로스 필터 파라미터 추가: `src/app/api/screener/golden-cross/route.ts`
  - `goldenCross` 파라미터를 이평선 필터와 독립적으로 처리
  - SQL 쿼리에서 골든크로스 조건을 선택적으로 적용
- [ ] T023 [US2] 타입 정의 업데이트: `src/types/golden-cross.ts`
  - `goldenCross` 필터를 별도 필드로 관리
- [ ] T024 [US2] SQL 쿼리 로직 수정: `src/app/api/screener/golden-cross/route.ts`
  - 골든크로스 조건을 이평선 정배열 조건과 독립적으로 적용

**Checkpoint**: 골든크로스 필터를 독립적으로 켜고 끄면서 결과가 정상적으로 변경되고, 이평선 필터와 조합하여 사용 가능함

---

## Phase 4: User Story 3 - 필터박스 UX 개선 (Priority: P1)

**Goal**: 필터박스에 현재 적용된 필터를 요약하여 표시하고, 클릭 시 팝업으로 상세 설정을 할 수 있도록 구현

**Independent Test**: 필터박스에 현재 적용된 필터가 올바르게 표시되는지, 그리고 팝업에서 필터를 변경하면 결과가 업데이트되는지 확인

### Tests for User Story 3

- [ ] T030 [P] [US3] FilterBox 컴포넌트 렌더링 테스트 작성: `src/components/filters/__tests__/FilterBox.test.tsx`
- [ ] T031 [P] [US3] FilterDialog 컴포넌트 테스트 작성: `src/components/filters/__tests__/FilterDialog.test.tsx`
- [ ] T032 [P] [US3] 필터 요약 로직 테스트 작성: `src/lib/__tests__/filter-summary.test.ts`

### Implementation for User Story 3

- [x] T033 [US3] 필터 요약 로직 구현: `src/lib/filter-summary.ts` (신규)
  - 활성화된 필터를 텍스트로 요약하는 함수
  - 필터 개수 계산
  - 카테고리별 필터 요약 함수 구현 (getMAFilterSummary, getGrowthFilterSummary, getProfitabilityFilterSummary)
- [x] T034 [US3] CategoryFilterBox 컴포넌트 생성: `src/components/filters/CategoryFilterBox.tsx` (신규)
  - 현재 적용된 필터 요약 표시
  - 클릭 시 팝업 열기
  - 카테고리별 필터박스 표시
- [x] T035 [US3] CategoryFilterDialog 컴포넌트 생성: `src/components/filters/CategoryFilterDialog.tsx` (신규)
  - Shadcn/ui Dialog 컴포넌트 활용
  - 카테고리별 필터 옵션 표시
  - 적용/취소/초기화 버튼
- [x] T036 [US3] 정배열 및 골든크로스 필터 컨트롤 구현: `src/components/filters/CategoryFilterDialog.tsx` 내부
  - 정배열 필터 토글 (MA20 > MA50 > MA100 > MA200)
  - 골든크로스 필터 토글 (MA50 > MA200)
  - 최근 전환 옵션 (정배열 필터 내부에 구분선으로 배치)
- [x] T037 [US3] 메인 페이지에 필터박스 및 팝업 통합: `src/app/screener/golden-cross/GoldenCrossClient.tsx`
  - 기존 필터 UI를 카테고리별 필터박스로 변경
  - CategoryFilterBox 및 CategoryFilterDialog 통합
  - 필터 상태 동기화
- [x] T038 [US3] 필터 상태 관리 업데이트: `src/app/screener/golden-cross/GoldenCrossClient.tsx`
  - URL 쿼리 파라미터와 필터 상태 동기화
  - 팝업 내부 필터 변경 시 미리보기
  - 적용 버튼 클릭 시 URL 업데이트

**Checkpoint**: 필터박스에 현재 적용된 필터가 올바르게 표시되고, 팝업에서 필터를 변경하면 결과가 업데이트됨

---

## Phase 5: 통합 및 마무리

**Purpose**: 모든 기능 통합 및 최종 검증

- [x] T040 [P] 모든 기존 테스트 케이스 통과 확인
- [ ] T041 [P] 새로운 테스트 케이스 통과 확인 (향후 추가 예정)
- [x] T042 [P] 필터 상태 URL 파라미터 호환성 확인
- [ ] T043 [P] README.md 업데이트 (새 필터 사용법 추가) (향후 추가 예정)
- [x] T044 코드 리뷰 및 리팩토링
  - 사용되지 않는 modal.tsx 삭제
  - 사용되지 않는 FilterDialog.tsx 삭제
  - 골든크로스 필터 높이 일관성 맞춤 (h-12 → h-10)
  - 불필요한 import 제거 (Filter icon)
- [x] T045 빌드 및 배포 테스트
  - 빌드 성공 확인
  - 경고 수정 완료

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup completion - MVP 기능
- **User Story 2 (Phase 3)**: Depends on User Story 1 completion - 골든크로스 필터 분리
- **User Story 3 (Phase 4)**: Depends on User Story 1, 2 completion - UI 개선
- **Polish (Phase 5)**: Depends on all user stories completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup - No dependencies on other stories
- **User Story 2 (P1)**: Depends on User Story 1 - 골든크로스 필터 분리
- **User Story 3 (P1)**: Depends on User Story 1, 2 - UI 개선 작업

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
2. Complete Phase 2: User Story 1 (이평선 필터 세분화)
3. **STOP and VALIDATE**: 각 이평선 필터가 정상 작동하는지 확인
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Final polish and compatibility → Deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- 기존 필터 기능은 모두 유지하며, 새로운 필터만 추가
- URL 파라미터 호환성을 위해 기존 파라미터도 지원 (점진적 마이그레이션)
