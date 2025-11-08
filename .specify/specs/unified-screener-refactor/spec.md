# Feature Specification: 통합 스크리너 리팩토링

**Feature Branch**: `feature/unified-screener-refactor`  
**Created**: 2025-11-07  
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 메인 페이지에서 바로 스크리닝 시작 (Priority: P1)

사용자가 애플리케이션에 접속하면 메인 페이지에서 바로 스크리너를 사용할 수 있어야 합니다. 별도의 스크리너 선택 페이지 없이 골든크로스 스크리너가 기본으로 표시됩니다.

**Why this priority**:

- 사용자 경험 단순화: 불필요한 페이지 이동 제거
- 가장 많이 사용되는 스크리너를 메인으로 배치하여 접근성 향상
- 애플리케이션의 핵심 기능을 즉시 사용 가능하게 함

**Independent Test**:
메인 페이지(`/`) 접속 시 골든크로스 스크리너가 바로 표시되고, 모든 필터 기능이 정상 작동하는지 확인

**Acceptance Scenarios**:

1. **Given** 사용자가 메인 페이지(`/`)에 접속, **When** 페이지 로드, **Then** 골든크로스 스크리너가 바로 표시됨
2. **Given** 메인 페이지에서, **When** 필터를 조정하고 검색, **Then** 필터링된 결과가 정상적으로 표시됨
3. **Given** 메인 페이지에서, **When** URL 파라미터로 필터 설정 후 접속, **Then** 해당 필터가 적용된 상태로 페이지가 로드됨

---

### User Story 2 - Golden Cross 필터 추가 (Priority: P1)

사용자가 Golden Cross 조건을 필터로 선택할 수 있어야 합니다. 현재는 항상 Golden Cross 조건만 적용되지만, 이를 선택 가능한 필터로 변경하여 Golden Cross 조건을 적용하거나 해제할 수 있어야 합니다.

**Why this priority**:

- 유연한 스크리닝: Golden Cross 조건 없이도 다른 필터로 종목 검색 가능
- 사용자 선택권 확대: 필요에 따라 Golden Cross 조건을 선택적으로 적용
- 기존 기능 확장: 현재 기능을 유지하면서 새로운 옵션 추가

**Independent Test**:
Golden Cross 필터를 켜고 끄면서 결과가 달라지는지, 그리고 다른 필터들과 조합하여 사용할 수 있는지 확인

**Acceptance Scenarios**:

1. **Given** 메인 페이지에서, **When** Golden Cross 필터를 활성화, **Then** MA20 > MA50 > MA100 > MA200 조건을 만족하는 종목만 표시됨
2. **Given** 메인 페이지에서, **When** Golden Cross 필터를 비활성화, **Then** Golden Cross 조건 없이 다른 필터만 적용된 종목이 표시됨
3. **Given** Golden Cross 필터가 비활성화된 상태에서, **When** 성장성 필터나 수익성 필터만 적용, **Then** 해당 조건만 만족하는 종목이 표시됨
4. **Given** Golden Cross 필터가 활성화된 상태에서, **When** "최근 전환" 옵션 선택, **Then** 최근에 Golden Cross로 전환한 종목만 표시됨

---

### User Story 3 - 불필요한 스크리너 UI 제거 (Priority: P2)

Rule of 40와 Turn-Around 스크리너의 UI와 라우트를 제거하되, 핵심 로직은 보존하여 추후 리뉴얼 시 재사용할 수 있도록 합니다.

**Why this priority**:

- UI 단순화: 사용자가 선택할 스크리너가 하나로 명확해짐
- 개발 리소스 집중: 하나의 스크리너에 집중하여 품질 향상
- 핵심 로직 보존: 추후 리뉴얼 시 재사용 가능한 로직 유지

**Independent Test**:
Rule of 40와 Turn-Around 관련 UI와 라우트가 제거되었는지, 그리고 핵심 로직은 보존되었는지 확인

**Acceptance Scenarios**:

1. **Given** 애플리케이션에서, **When** `/screener/rule-of-40` 또는 `/screener/turn-around` 접속 시도, **Then** 404 에러 또는 리다이렉트 발생
2. **Given** 메인 페이지에서, **When** 페이지 로드, **Then** Rule of 40와 Turn-Around 관련 UI 요소가 표시되지 않음
3. **Given** 코드베이스에서, **When** Rule of 40 또는 Turn-Around 핵심 로직 파일 검색, **Then** 핵심 로직 파일은 보존되어 있음 (예: API 로직, 계산 함수 등)

---

### Edge Cases

- Golden Cross 필터가 비활성화된 상태에서 "최근 전환" 옵션을 선택하면 어떻게 동작하는가?
  - "최근 전환" 옵션은 Golden Cross 필터가 활성화된 경우에만 의미가 있으므로, Golden Cross 필터가 비활성화되면 "최근 전환" 옵션도 자동으로 비활성화되어야 함
- URL에 기존 `/screener/golden-cross` 경로로 접속하면 어떻게 동작하는가?
  - 기존 URL 호환성을 위해 `/screener/golden-cross`로 접속 시 메인 페이지(`/`)로 리다이렉트하거나, 메인 페이지와 동일한 내용을 표시
- 필터 상태를 URL에 저장하는 경우, Golden Cross 필터 파라미터가 없으면 기본값은 무엇인가?
  - 기본값은 `goldenCross=true`로 설정하여 기존 동작과 일치시킴

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 시스템은 메인 페이지(`/`)에서 골든크로스 스크리너를 기본으로 표시해야 함
- **FR-002**: 시스템은 Golden Cross 조건을 선택 가능한 필터로 제공해야 함 (기본값: 활성화)
- **FR-003**: 시스템은 Golden Cross 필터가 비활성화된 경우 "최근 전환" 옵션을 자동으로 비활성화해야 함
- **FR-004**: 시스템은 Rule of 40와 Turn-Around 스크리너의 UI와 라우트를 제거하되, 핵심 로직(API 엔드포인트, 계산 함수 등)은 보존해야 함
- **FR-005**: 시스템은 기존 `/screener/golden-cross` 경로 접속 시 메인 페이지로 리다이렉트하거나 동일한 내용을 표시해야 함
- **FR-006**: 시스템은 Golden Cross 필터 상태를 URL 쿼리 파라미터로 관리해야 함 (`goldenCross=true/false`)
- **FR-007**: 시스템은 기존의 모든 필터 기능(성장성, 수익성, 시총, 가격 등)을 유지해야 함
- **FR-008**: 시스템은 API 엔드포인트 `/api/screener/golden-cross`에 `goldenCross` 파라미터를 추가하여 필터링 로직을 제어해야 함

### Key Entities

- **Screener Filter State**: 필터 상태를 관리하는 엔티티

  - `goldenCross`: boolean (Golden Cross 조건 적용 여부)
  - `justTurned`: boolean (최근 전환 여부, goldenCross가 true일 때만 유효)
  - 기존 필터들: `revenueGrowth`, `incomeGrowth`, `profitability`, `minMcap`, `minPrice` 등

- **API Request Parameters**: API 요청 파라미터
  - `goldenCross`: boolean (기본값: true, 기존 동작과 일치)
  - 기존 파라미터들 유지

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 메인 페이지 접속 시 골든크로스 스크리너가 1초 이내에 표시됨
- **SC-002**: Golden Cross 필터를 토글할 때 결과가 2초 이내에 업데이트됨
- **SC-003**: 기존 필터 기능들이 모두 정상 작동하며 성능 저하가 없음
- **SC-004**: Rule of 40와 Turn-Around 관련 UI와 라우트가 제거되고, 핵심 로직은 보존됨
- **SC-005**: 기존 `/screener/golden-cross` URL로 접속 시 정상 작동 (리다이렉트 또는 동일 내용 표시)
- **SC-006**: 모든 기존 테스트 케이스가 통과하며, 새로운 테스트 케이스가 추가됨
