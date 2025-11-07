# Tasks: 통합 스크리너 리팩토링

**Input**: Design documents from `/specs/unified-screener-refactor/`
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

- [ ] T001 브랜치 생성: `feature/unified-screener-refactor`
- [ ] T002 [P] 현재 코드베이스 구조 파악 및 영향 범위 분석
- [ ] T003 [P] 기존 테스트 실행하여 현재 상태 확인

---

## Phase 2: User Story 1 - 메인 페이지에서 바로 스크리닝 시작 (Priority: P1) 🎯 MVP

**Goal**: 메인 페이지(`/`)에 골든크로스 스크리너를 기본으로 표시하고, 모든 필터 기능이 정상 작동하도록 구현

**Independent Test**: 메인 페이지 접속 시 골든크로스 스크리너가 바로 표시되고, 모든 필터 기능이 정상 작동하는지 확인

### Tests for User Story 1

- [ ] T010 [P] [US1] 메인 페이지 렌더링 테스트 작성: `src/app/__tests__/page.test.tsx`
- [ ] T011 [P] [US1] 메인 페이지에서 필터 동작 통합 테스트 작성: `src/app/__tests__/page.integration.test.tsx`

### Implementation for User Story 1

- [ ] T012 [US1] `src/app/page.tsx`를 골든크로스 스크리너로 변경
  - 기존 `/screener/golden-cross/page.tsx` 내용을 메인 페이지로 이동
  - 스크리너 선택 UI 제거
  - Navigation 컴포넌트 제거 또는 수정
- [ ] T013 [US1] `src/app/screener/golden-cross/page.tsx`를 메인 페이지로 리다이렉트하도록 수정
- [ ] T014 [US1] 메인 페이지에서 기존 필터 기능 모두 정상 작동 확인
  - 성장성 필터 (매출/수익)
  - 수익성 필터
  - 기타 필터들

**Checkpoint**: 메인 페이지에서 골든크로스 스크리너가 정상적으로 표시되고 모든 필터가 작동함

---

## Phase 3: User Story 2 - Golden Cross 필터 추가 (Priority: P1)

**Goal**: Golden Cross 조건을 선택 가능한 필터로 추가하고, 필터가 비활성화되면 "최근 전환" 옵션도 자동으로 비활성화

**Independent Test**: Golden Cross 필터를 켜고 끄면서 결과가 달라지는지, 그리고 다른 필터들과 조합하여 사용할 수 있는지 확인

### Tests for User Story 2

- [ ] T020 [P] [US2] API 엔드포인트에 `goldenCross` 파라미터 테스트 추가: `src/app/api/screener/golden-cross/__tests__/route.test.ts`
- [ ] T021 [P] [US2] Golden Cross 필터 UI 컴포넌트 테스트 작성: `src/components/filters/__tests__/GoldenCrossFilter.test.tsx`

### Implementation for User Story 2

- [ ] T022 [US2] API 엔드포인트에 `goldenCross` 파라미터 추가: `src/app/api/screener/golden-cross/route.ts`
  - `goldenCross` 파라미터 파싱 (기본값: `true`)
  - SQL 쿼리에서 Golden Cross 조건을 선택적으로 적용
  - `goldenCross=false`일 때는 MA 정배열 조건 제거
- [ ] T023 [US2] 타입 정의 업데이트: `src/types/golden-cross.ts`
  - `GoldenCrossParams`에 `goldenCross?: boolean` 추가
- [ ] T024 [US2] 프론트엔드에 Golden Cross 필터 UI 추가: `src/app/page.tsx` (또는 별도 컴포넌트)
  - 체크박스 또는 토글 스위치로 Golden Cross 필터 추가
  - 필터 상태를 URL 쿼리 파라미터로 관리 (`nuqs` 사용)
- [ ] T025 [US2] "최근 전환" 옵션 로직 수정: `src/app/page.tsx`
  - Golden Cross 필터가 비활성화되면 "최근 전환" 옵션 자동 비활성화
  - UI에서 "최근 전환" 옵션이 비활성화 상태로 표시
- [ ] T026 [US2] 필터 설명 텍스트 업데이트: `src/app/page.tsx`
  - Golden Cross 필터 상태에 따라 설명 텍스트 동적 변경

**Checkpoint**: Golden Cross 필터를 켜고 끄면서 결과가 정상적으로 변경되고, "최근 전환" 옵션이 올바르게 동작함

---

## Phase 4: User Story 3 - 불필요한 스크리너 UI 제거 (Priority: P2)

**Goal**: Rule of 40와 Turn-Around 스크리너의 UI와 라우트를 제거하되, 핵심 로직은 보존

**Independent Test**: Rule of 40와 Turn-Around 관련 UI와 라우트가 제거되었는지, 그리고 핵심 로직은 보존되었는지 확인

### Tests for User Story 3

- [ ] T030 [P] [US3] Rule of 40와 Turn-Around 라우트 제거 확인 테스트 작성
- [ ] T031 [P] [US3] API 엔드포인트 보존 확인 테스트 작성

### Implementation for User Story 3

- [ ] T032 [US3] Rule of 40 페이지 UI 제거: `src/app/screener/rule-of-40/page.tsx` 삭제
- [ ] T033 [US3] Turn-Around 페이지 UI 제거: `src/app/screener/turn-around/page.tsx` 삭제
- [ ] T034 [US3] Rule of 40 클라이언트 컴포넌트 제거: `src/app/screener/rule-of-40/RuleOf40Client.tsx` 삭제
- [ ] T035 [US3] Turn-Around 클라이언트 컴포넌트 제거: `src/app/screener/turn-around/TurnAroundClient.tsx` 삭제
- [ ] T036 [US3] API 엔드포인트 보존 확인: `src/app/api/screener/rule-of-40/route.ts` 유지
- [ ] T037 [US3] API 엔드포인트 보존 확인: `src/app/api/screener/turned-profitable/route.ts` 유지
- [ ] T038 [US3] 404 페이지 또는 리다이렉트 설정: `/screener/rule-of-40`, `/screener/turn-around` 접속 시 처리

**Checkpoint**: Rule of 40와 Turn-Around UI가 제거되고, API 엔드포인트는 보존되어 있음

---

## Phase 5: URL 호환성 및 마무리

**Purpose**: 기존 URL 호환성 유지 및 최종 검증

- [ ] T040 `/screener/golden-cross` 경로를 메인 페이지로 리다이렉트 설정
- [ ] T041 [P] 모든 기존 테스트 케이스 통과 확인
- [ ] T042 [P] 새로운 테스트 케이스 통과 확인
- [ ] T043 [P] README.md 업데이트 (메인 페이지 변경 사항 반영)
- [ ] T044 코드 리뷰 및 리팩토링
- [ ] T045 빌드 및 배포 테스트

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup completion - MVP 기능
- **User Story 2 (Phase 3)**: Depends on User Story 1 completion - 필터 기능 추가
- **User Story 3 (Phase 4)**: Can run in parallel with User Story 2 (different files)
- **Polish (Phase 5)**: Depends on all user stories completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup - No dependencies on other stories
- **User Story 2 (P1)**: Depends on User Story 1 - 필터 기능 추가
- **User Story 3 (P2)**: Can run in parallel with User Story 2 - UI 제거 작업

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- API 변경 후 프론트엔드 변경
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel
- Tests for a user story marked [P] can run in parallel
- User Story 3 can run in parallel with User Story 2 (different files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 1 (메인 페이지 리팩토링)
3. **STOP and VALIDATE**: 메인 페이지에서 스크리너가 정상 작동하는지 확인
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Final polish and compatibility → Deploy

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup together
2. Once Setup is done:
   - Developer A: User Story 1 (메인 페이지)
   - Developer B: User Story 2 (필터 추가) - User Story 1 완료 후 시작
   - Developer C: User Story 3 (UI 제거) - 병렬 가능
3. Stories complete and integrate

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- API 엔드포인트는 보존하여 추후 리뉴얼 시 재사용 가능하도록 함

