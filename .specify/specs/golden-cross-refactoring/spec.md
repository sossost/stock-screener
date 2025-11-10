# Feature Specification: 주식 스크리너 리팩토링

**Feature Branch**: `feature/golden-cross-refactoring`  
**Created**: 2025-11-10  
**Status**: Draft  
**Input**: REFACTORING_REVIEW.md 검수 결과 기반 (티커 검색 필터 포함)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 타입 정의 및 포맷팅 함수 분리 (Priority: P1)

개발자가 코드를 더 쉽게 유지보수하고 재사용할 수 있도록 타입 정의와 포맷팅 함수를 컴포넌트 파일에서 분리합니다.

**Why this priority**:

- 타입 정의와 유틸리티 함수는 여러 곳에서 재사용 가능
- 컴포넌트 파일의 복잡도 감소
- 테스트 작성 용이

**Independent Test**:
타입 정의가 `src/types/golden-cross.ts`에 있고, 포맷팅 함수가 `src/utils/format.ts`에 있으며, `GoldenCrossClient.tsx`에서 정상적으로 import되어 사용되는지 확인

**Acceptance Scenarios**:

1. **Given** `GoldenCrossClient.tsx`에 타입 정의가 있는 상태, **When** 타입을 `src/types/golden-cross.ts`로 이동, **Then** 컴포넌트에서 정상적으로 import되어 사용됨
2. **Given** `GoldenCrossClient.tsx`에 포맷팅 함수가 있는 상태, **When** 함수를 `src/utils/format.ts`로 이동, **Then** 컴포넌트에서 정상적으로 import되어 사용됨
3. **Given** 타입과 함수가 분리된 상태, **When** 빌드 및 테스트 실행, **Then** 모든 테스트 통과 및 빌드 성공

---

### User Story 2 - 필터 상태 관리 커스텀 훅 분리 (Priority: P1)

필터 상태 관리 로직을 커스텀 훅으로 분리하여 재사용성과 테스트 가능성을 향상시킵니다.

**Why this priority**:

- 10개 이상의 `useQueryState`가 한 파일에 있어 복잡도가 높음
- 필터 상태 관리 로직을 독립적으로 테스트 가능
- 다른 컴포넌트에서도 재사용 가능

**Independent Test**:
`useFilterState` 훅이 모든 필터 상태를 관리하고, `ScreenerClient.tsx`에서 정상적으로 사용되는지 확인

**Acceptance Scenarios**:

1. **Given** `GoldenCrossClient.tsx`에 여러 `useQueryState`가 있는 상태, **When** `src/hooks/useFilterState.ts`로 분리, **Then** 모든 필터 상태가 훅에서 관리되고 컴포넌트에서 정상 작동
2. **Given** 필터 상태 관리 훅이 생성된 상태, **When** 필터 값 변경, **Then** URL 쿼리 파라미터가 정상적으로 업데이트됨
3. **Given** 필터 상태 관리 훅이 분리된 상태, **When** 빌드 및 테스트 실행, **Then** 모든 테스트 통과 및 빌드 성공

---

### User Story 3 - 티커 검색 로직 커스텀 훅 분리 (Priority: P2)

티커 검색 관련 로직(debounce, useDeferredValue)을 커스텀 훅으로 분리합니다.

**Why this priority**:

- 검색 로직이 독립적으로 테스트 가능
- 다른 컴포넌트에서도 재사용 가능
- 컴포넌트 파일 크기 감소

**Independent Test**:
`useTickerSearch` 훅이 debounce와 useDeferredValue를 포함하여 검색 로직을 관리하고, `ScreenerClient.tsx`에서 정상적으로 사용되는지 확인

**Acceptance Scenarios**:

1. **Given** `GoldenCrossClient.tsx`에 티커 검색 로직이 있는 상태, **When** `src/hooks/useTickerSearch.ts`로 분리, **Then** 검색 기능이 정상 작동
2. **Given** 티커 검색 훅이 생성된 상태, **When** 검색어 입력, **Then** debounce와 useDeferredValue가 정상 작동
3. **Given** 티커 검색 훅이 분리된 상태, **When** 빌드 및 테스트 실행, **Then** 모든 테스트 통과 및 빌드 성공

---

### User Story 4 - 필터 액션 커스텀 훅 분리 (Priority: P2)

필터 변경, 적용, 초기화 로직을 커스텀 훅으로 분리합니다.

**Why this priority**:

- `handleFilterChange` 함수가 12개의 파라미터를 받아 복잡함
- 필터 액션 로직을 독립적으로 테스트 가능
- 컴포넌트 파일 크기 감소

**Independent Test**:
`useFilterActions` 훅이 필터 변경, 적용, 초기화 로직을 관리하고, `ScreenerClient.tsx`에서 정상적으로 사용되는지 확인

**Acceptance Scenarios**:

1. **Given** `GoldenCrossClient.tsx`에 필터 액션 함수들이 있는 상태, **When** `src/hooks/useFilterActions.ts`로 분리, **Then** 필터 변경/적용/초기화가 정상 작동
2. **Given** 필터 액션 훅이 생성된 상태, **When** 필터 변경, **Then** 캐시 무효화 및 URL 업데이트가 정상 작동
3. **Given** 필터 액션 훅이 분리된 상태, **When** 빌드 및 테스트 실행, **Then** 모든 테스트 통과 및 빌드 성공

---

### User Story 5 - 테이블 컴포넌트 분리 (Priority: P3)

테이블 렌더링 로직을 별도 컴포넌트로 분리합니다.

**Why this priority**:

- 테이블 렌더링 로직이 컴포넌트에 직접 포함되어 있음
- 다른 스크리너에서도 재사용 가능
- 컴포넌트 파일 크기 감소

**Independent Test**:
`StockTable` 컴포넌트가 테이블 렌더링을 담당하고, `ScreenerClient.tsx`에서 정상적으로 사용되는지 확인

**Acceptance Scenarios**:

1. **Given** `GoldenCrossClient.tsx`에 테이블 렌더링 로직이 있는 상태, **When** `src/components/screener/StockTable.tsx`로 분리, **Then** 테이블이 정상적으로 렌더링됨
2. **Given** 테이블 컴포넌트가 생성된 상태, **When** 데이터 전달, **Then** 테이블이 정상적으로 표시됨
3. **Given** 테이블 컴포넌트가 분리된 상태, **When** 빌드 및 테스트 실행, **Then** 모든 테스트 통과 및 빌드 성공

---

### Edge Cases

- 타입 정의 분리 시 import 경로가 올바른지 확인
- 훅 분리 시 의존성 순환(circular dependency)이 발생하지 않는지 확인
- 컴포넌트 분리 시 props 전달이 올바른지 확인
- 리팩토링 중에도 기존 기능이 정상 작동하는지 확인

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 시스템은 타입 정의를 `src/types/` 디렉토리에 배치해야 함
- **FR-002**: 시스템은 포맷팅 함수를 `src/utils/` 디렉토리에 배치해야 함
- **FR-003**: 시스템은 필터 상태 관리 로직을 커스텀 훅으로 분리해야 함
- **FR-004**: 시스템은 티커 검색 로직을 커스텀 훅으로 분리해야 함
- **FR-005**: 시스템은 필터 액션 로직을 커스텀 훅으로 분리해야 함
- **FR-006**: 시스템은 테이블 렌더링 로직을 별도 컴포넌트로 분리해야 함
- **FR-007**: 시스템은 리팩토링 후에도 기존 기능이 정상 작동해야 함
- **FR-008**: 시스템은 각 모듈이 300줄 이하를 유지해야 함

### Key Entities

- **useFilterState**: 필터 상태를 관리하는 커스텀 훅
- **useTickerSearch**: 티커 검색 로직을 관리하는 커스텀 훅
- **useFilterActions**: 필터 액션(변경, 적용, 초기화)을 관리하는 커스텀 훅
- **StockTable**: 종목 테이블을 렌더링하는 컴포넌트

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `ScreenerClient.tsx` 파일 크기가 300줄 이하로 감소
- **SC-002**: 모든 타입 정의가 `src/types/screener.ts` (또는 `golden-cross.ts`)에 위치
- **SC-003**: 모든 포맷팅 함수가 `src/utils/format.ts`에 위치
- **SC-004**: 필터 상태 관리가 `useFilterState` 훅으로 분리됨
- **SC-005**: 티커 검색 로직이 `useTickerSearch` 훅으로 분리됨
- **SC-006**: 필터 액션이 `useFilterActions` 훅으로 분리됨
- **SC-007**: 테이블 렌더링이 `StockTable` 컴포넌트로 분리됨
- **SC-008**: 리팩토링 후 모든 기존 테스트가 통과함
- **SC-009**: 리팩토링 후 빌드가 성공함
- **SC-010**: 리팩토링 후 기존 기능이 정상 작동함
