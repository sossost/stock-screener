# Feature Specification: 테이블에 섹터 컬럼 추가

**Feature Branch**: `feature/table-sector-column`  
**Created**: 2025-11-26  
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 섹터 컬럼 표시 (Priority: P1)

사용자가 스크리너 테이블에서 각 종목이 속한 섹터를 한눈에 볼 수 있어야 한다. `symbols.sector`에 값이 없으면 "-"로 명확히 표시한다.

**Why this priority**: 기본 문맥 정보로 필수이며, 이미 데이터가 존재하는 필드를 노출만 하면 되므로 구현 비용이 낮다.

**Independent Test**: API 응답에 sector가 포함되고, UI 테이블이 섹터 값을/빈값 "-"를 표시하는지만 확인하면 된다.

**Acceptance Scenarios**:

1. **Given** 스크리너 결과에 섹터가 있는 종목, **When** 테이블을 조회, **Then** 섹터 컬럼에 해당 섹터명이 표시된다.
2. **Given** 섹터 정보가 없는 종목, **When** 테이블을 조회, **Then** 섹터 컬럼에 "-"가 표시된다.
3. **Given** API가 정상 응답, **When** 응답 JSON을 확인, **Then** 각 종목 객체에 `sector` 필드가 포함되어 있다.

---

### User Story 2 - 섹터 기준 정렬 (Priority: P2)

사용자가 섹터 컬럼 헤더를 클릭해 섹터명을 기준으로 오름/내림차순 정렬할 수 있어야 한다. 기본 정렬(시가총액 내림차순)은 유지한다.

**Why this priority**: 같은 섹터를 묶어 보는 탐색 수요가 높으며, 기존 정렬 UX 패턴을 재사용하면 구현이 단순하다.

**Independent Test**: 섹터 헤더 클릭 시 정렬 방향이 토글되고, 섹터가 같은 종목은 알파벳/한글 순으로 정렬되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 서로 다른 섹터가 섞인 결과, **When** 섹터 헤더를 한 번 클릭, **Then** 섹터명이 오름차순으로 정렬되고 정렬 아이콘이 표시된다.
2. **Given** 섹터 정렬이 적용된 상태, **When** 섹터 헤더를 다시 클릭, **Then** 내림차순으로 전환된다.
3. **Given** 섹터 값이 없는 종목, **When** 섹터 기준 정렬, **Then** 값이 있는 종목 뒤로 정렬되어 표시된다.

---

### User Story 3 - 섹터 필터 (Priority: P3)

사용자가 선택한 섹터만 보이도록 필터링할 수 있어야 한다(다중 선택 지원 여부는 확인 필요). 필터 요약/쿼리 파라미터에 섹터 선택이 반영된다.

**Why this priority**: 섹터별 비교 시 불필요한 종목을 제거해 탐색 속도를 높일 수 있다.

**Independent Test**: 특정 섹터를 선택했을 때 해당 섹터 종목만 남고, 필터 요약/URL 파라미터에 선택값이 유지되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 섹터 필터에서 A 섹터를 선택, **When** 테이블을 확인, **Then** A 섹터 종목만 표시된다.
2. **Given** 섹터 필터에서 다중 섹터 선택(NEEDS CLARIFICATION), **When** 테이블을 확인, **Then** 선택된 섹터의 종목만 표시된다.
3. **Given** 필터가 적용된 상태, **When** 페이지 새로고침, **Then** 동일한 섹터 필터가 유지된다(쿼리 파라미터 반영).

---

### Edge Cases

- 섹터 정보가 없는 티커: "-"로 표시하고 정렬 시 뒤로 보낸다.
- 섹터 문자열이 긴 경우(예: "Technology Equipment & Services"): 폭을 넉넉히 잡고 줄바꿈/툴팁 검토.
- 섹터 값의 포맷이 불규칙하거나 대소문자 혼용인 경우: 원본 문자열을 그대로 표시(추가 정규화는 후속 결정).
- API/DB에 섹터가 null인데 UI가 필터/정렬 요청을 보낼 때: 안전하게 제외하거나 "-” 그룹으로 취급.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Golden Cross API 응답에 `sector` 필드를 포함해야 한다(`symbols.sector` 소스, null 허용).
- **FR-002**: `GoldenCrossCompany` 및 `ScreenerCompany` 타입 정의에 `sector: string | null`을 추가해야 한다.
- **FR-003**: 스크리너 테이블에 섹터 컬럼을 추가하고, 값 없을 때 "-"를 표시해야 한다.
- **FR-004**: 섹터 컬럼 헤더 클릭으로 오름/내림차순 정렬을 지원해야 한다(기본 정렬은 기존 유지).
- **FR-005**: 테이블 스켈레톤/캡션 등 레이아웃이 섹터 컬럼 추가 후에도 정렬/폭 깨짐 없이 동작해야 한다.
- **FR-006**: 섹터 필터를 제공하고 선택값을 URL 쿼리/필터 요약에 반영해야 한다(NEEDS CLARIFICATION: 단일 vs 다중 선택, 기본값).

### Key Entities

- **symbols.sector**: 텍스트 컬럼. ETL(`load-nasdaq-symbols`)에서 채워지며 null일 수 있음.
- **GoldenCrossCompany/ScreenerCompany**: API/프론트 모델에 `sector: string | null` 추가.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `/api/screener/golden-cross` 응답 JSON의 각 종목 객체에 `sector`가 포함된다.
- **SC-002**: 테이블에서 섹터 컬럼이 표시되고, 섹터가 없는 종목은 "-"로 렌더링된다.
- **SC-003**: 섹터 헤더 클릭 시 오름/내림 정렬이 토글되고, null 값은 항상 뒤에 정렬된다.
- **SC-004**: (필터 구현 시) 섹터 필터 적용 후 다른 섹터 종목이 결과에 포함되지 않는다.
- **SC-005**: 기존 기본 정렬/필터/검색 UX는 변화 없이 동작하며, 빌드/테스트가 모두 통과한다.
