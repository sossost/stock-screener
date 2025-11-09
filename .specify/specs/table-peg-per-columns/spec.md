# Feature Specification: 테이블에 PEG 및 PER 컬럼 추가

**Feature Branch**: `feature/table-peg-per-columns`  
**Created**: 2025-11-09
**Status**: Completed

## User Scenarios & Testing _(mandatory)_

### User Story 1 - PER 컬럼 추가 (Priority: P1)

사용자가 테이블에서 각 종목의 PER(Price-to-Earnings Ratio, 주가수익비율)을 확인할 수 있어야 합니다. PER은 주가를 주당순이익(EPS)으로 나눈 값으로, 종목의 밸류에이션을 평가하는 중요한 지표입니다.

**Why this priority**:

- 밸류에이션 평가: PER을 통해 종목이 저평가/고평가인지 판단 가능
- 투자 의사결정 지원: PER이 낮은 종목은 상대적으로 저평가일 가능성이 높음
- 기존 데이터 활용: quarterly_ratios 테이블에 이미 pe_ratio 데이터가 존재

**Independent Test**:
PER 컬럼이 올바르게 표시되고, 데이터가 없는 경우 "-"로 표시되는지 확인

**Acceptance Scenarios**:

1. **Given** 스크리너 페이지에서, **When** 종목 목록을 확인, **Then** 각 종목의 PER 값이 테이블에 표시됨
2. **Given** PER 데이터가 없는 종목이 있을 때, **When** 테이블을 확인, **Then** 해당 종목의 PER 컬럼에 "-"가 표시됨
3. **Given** PER 값이 있는 종목이 있을 때, **When** 테이블을 확인, **Then** PER 값이 소수점 2자리까지 포맷되어 표시됨 (예: 15.23)

---

### User Story 2 - PEG 컬럼 추가 (Priority: P1)

사용자가 테이블에서 각 종목의 PEG(Price/Earnings to Growth Ratio)를 확인할 수 있어야 합니다. PEG는 PER을 성장률로 나눈 값으로, 성장성을 고려한 밸류에이션 지표입니다. 일반적으로 PEG가 1 이하이면 저평가로 간주됩니다.

**Why this priority**:

- 성장성 고려 밸류에이션: PER만으로는 부족한 성장성을 고려한 평가 가능
- 투자 의사결정 지원: PEG가 낮은 종목은 성장 대비 저평가일 가능성이 높음
- 기존 데이터 활용: quarterly_ratios 테이블에 이미 peg_ratio 데이터가 존재

**Independent Test**:
PEG 컬럼이 올바르게 표시되고, 데이터가 없는 경우 "-"로 표시되는지 확인

**Acceptance Scenarios**:

1. **Given** 스크리너 페이지에서, **When** 종목 목록을 확인, **Then** 각 종목의 PEG 값이 테이블에 표시됨
2. **Given** PEG 데이터가 없는 종목이 있을 때, **When** 테이블을 확인, **Then** 해당 종목의 PEG 컬럼에 "-"가 표시됨
3. **Given** PEG 값이 있는 종목이 있을 때, **When** 테이블을 확인, **Then** PEG 값이 소수점 2자리까지 포맷되어 표시됨 (예: 0.85)

---

### User Story 3 - PEG 필터 추가 (Priority: P1)

사용자가 성장성 필터 내에서 PEG < 1 조건으로 저평가 종목만 필터링할 수 있어야 합니다. PEG 필터는 음수 값을 제외하고 0 이상 1 미만인 종목만 필터링합니다.

**Why this priority**:

- 저평가 종목 발굴: PEG < 1은 성장 대비 저평가를 의미하는 중요한 기준
- 필터링 효율성: 테이블에서 직접 확인하기 전에 필터로 사전 선별 가능
- 사용자 편의성: 성장성 필터 카테고리 내에서 일관된 UX 제공

**Independent Test**:
PEG 필터가 활성화되면 PEG < 1인 종목만 표시되고, 음수 값은 제외되는지 확인

**Acceptance Scenarios**:

1. **Given** 성장성 필터 팝업에서, **When** "저평가 필터 (PEG < 1)" 체크박스를 활성화, **Then** PEG가 0 이상 1 미만인 종목만 표시됨
2. **Given** PEG 필터가 활성화된 상태에서, **When** 결과를 확인, **Then** 음수 PEG 값을 가진 종목은 표시되지 않음
3. **Given** PEG 필터가 활성화된 상태에서, **When** 필터 요약을 확인, **Then** "PEG < 1"이 성장성 필터 요약에 표시됨

---

### Edge Cases

- PER 또는 PEG 데이터가 없는 경우 어떻게 표시하는가?
  - "-"로 표시하여 데이터가 없음을 명확히 표시
- PER 또는 PEG 값이 음수인 경우 어떻게 표시하는가?
  - 음수 값도 그대로 표시 (적자 기업의 경우 PER이 음수일 수 있음)
- PER 또는 PEG 값이 매우 큰 경우 (예: 1000 이상) 어떻게 표시하는가?
  - 소수점 2자리까지 표시하되, 필요시 천 단위 구분자 사용 고려
- quarterly_ratios 테이블에 데이터가 없는 종목은 어떻게 처리하는가?
  - LEFT JOIN을 사용하여 데이터가 없어도 종목은 표시되며, PER/PEG는 "-"로 표시

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 시스템은 테이블에 PER(Price-to-Earnings Ratio) 컬럼을 추가해야 함
- **FR-002**: 시스템은 테이블에 PEG(Price/Earnings to Growth Ratio) 컬럼을 추가해야 함
- **FR-003**: 시스템은 API 응답에 PER 및 PEG 데이터를 포함해야 함
- **FR-004**: 시스템은 PER 및 PEG 데이터가 없는 경우 "-"로 표시해야 함
- **FR-005**: 시스템은 PER 및 PEG 값을 소수점 2자리까지 포맷하여 표시해야 함
- **FR-006**: 시스템은 quarterly_ratios 테이블에서 최신 분기의 PER 및 PEG 데이터를 가져와야 함
- **FR-007**: 시스템은 타입 정의에 PER 및 PEG 필드를 추가해야 함
- **FR-008**: 시스템은 성장성 필터에 PEG < 1 필터를 제공해야 함
- **FR-009**: 시스템은 PEG 필터에서 음수 값을 제외하고 0 이상 1 미만인 값만 필터링해야 함

### Key Entities

- **GoldenCrossCompany**: 종목 정보를 담는 엔티티

  - `pe_ratio`: number | null (PER 값)
  - `peg_ratio`: number | null (PEG 값)

- **API Response**: API 응답 구조

  - `pe_ratio`: 최신 분기의 PER 값
  - `peg_ratio`: 최신 분기의 PEG 값

- **Database Schema**: quarterly_ratios 테이블
  - `pe_ratio`: numeric (PER 값)
  - `peg_ratio`: numeric (PEG 값)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 테이블에 PER 컬럼이 추가되고, 값이 올바르게 표시됨
- **SC-002**: 테이블에 PEG 컬럼이 추가되고, 값이 올바르게 표시됨
- **SC-003**: PER 및 PEG 데이터가 없는 경우 "-"로 표시됨
- **SC-004**: PER 및 PEG 값이 소수점 2자리까지 포맷되어 표시됨
- **SC-005**: API 응답에 PER 및 PEG 데이터가 포함됨
- **SC-006**: 기존 테이블 기능(정렬, 필터링 등)이 정상 작동함
- **SC-007**: 모든 기존 테스트 케이스가 통과함
- **SC-008**: 빌드가 성공적으로 완료됨
- **SC-009**: 성장성 필터에 PEG < 1 필터가 추가되고 정상 작동함
- **SC-010**: PEG 필터가 활성화되면 0 이상 1 미만인 종목만 표시되고 음수는 제외됨
