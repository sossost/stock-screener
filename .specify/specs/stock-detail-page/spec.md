# Feature Specification: 종목 상세 페이지

**Feature Branch**: `feature/stock-detail-page`  
**Created**: 2025-11-26  
**Status**: Draft

## Overview

스크리너 테이블에서 종목을 클릭하면 해당 종목의 상세 정보를 확인할 수 있는 페이지. 기존 DB에 저장된 데이터(symbols, quarterlyFinancials, quarterlyRatios, dailyPrices, dailyMa)를 활용하여 외부 API 호출 없이 구현한다.

### Implementation Phases

| Phase | 범위 | 우선순위 |
|-------|------|----------|
| Phase 1 | 기본 정보 + 가격/기술적 지표 | P1 (MVP) |
| Phase 2 | 밸류에이션 & 수익성 지표 | P2 |
| Phase 3 | 분기별 실적 차트 확장 | P3 |
| Phase 4 | 주가 차트 & 동종업계 비교 | P4 |

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 종목 상세 페이지 접근 (Priority: P1)

사용자가 스크리너 테이블에서 종목 티커를 클릭하면 해당 종목의 상세 페이지(`/stock/[symbol]`)로 이동한다.

**Why this priority**: 상세 페이지 진입점이 없으면 다른 기능을 사용할 수 없으므로 필수.

**Independent Test**: 테이블에서 티커 클릭 시 올바른 URL로 라우팅되고, 페이지가 정상 렌더링되는지 확인.

**Acceptance Scenarios**:

1. **Given** 스크리너 테이블에 종목이 표시됨, **When** 티커(예: AAPL)를 클릭, **Then** `/stock/AAPL` 페이지로 이동한다.
2. **Given** 상세 페이지 URL에 유효한 심볼, **When** 페이지 로드, **Then** 해당 종목 정보가 표시된다.
3. **Given** 상세 페이지 URL에 존재하지 않는 심볼, **When** 페이지 로드, **Then** 404 또는 "종목을 찾을 수 없습니다" 메시지가 표시된다.

---

### User Story 2 - 기본 정보 표시 (Priority: P1)

사용자가 상세 페이지에서 종목의 기본 정보(회사명, 섹터, 산업, 거래소, 시가총액)를 확인할 수 있다.

**Why this priority**: 종목 식별을 위한 핵심 정보이며, `symbols` 테이블에서 바로 조회 가능.

**Independent Test**: API 응답에 기본 정보 필드가 포함되고, UI에 올바르게 표시되는지 확인.

**Acceptance Scenarios**:

1. **Given** 유효한 심볼로 상세 페이지 접근, **When** 페이지 로드, **Then** 회사명, 티커, 섹터가 헤더에 표시된다.
2. **Given** 섹터/산업 정보가 없는 종목, **When** 페이지 로드, **Then** 해당 필드는 "-"로 표시된다.
3. **Given** 시가총액이 있는 종목, **When** 페이지 로드, **Then** 포맷된 시가총액(예: 2.5T, 150B)이 표시된다.

---

### User Story 3 - 가격 및 이평선 상태 표시 (Priority: P1)

사용자가 현재가, RS Score, 이동평균선(20/50/100/200일), 정배열/골든크로스 상태를 확인할 수 있다.

**Why this priority**: 스크리너의 핵심 필터 조건을 상세 페이지에서도 확인할 수 있어야 한다.

**Independent Test**: `dailyPrices`, `dailyMa` 데이터가 올바르게 조회되고, 이평선 비교 로직이 정확한지 확인.

**Acceptance Scenarios**:

1. **Given** 유효한 심볼, **When** 상세 페이지 로드, **Then** 최신 종가와 RS Score가 표시된다.
2. **Given** MA20 > MA50 > MA100 > MA200인 종목, **When** 상세 페이지 로드, **Then** "정배열" 뱃지가 표시된다.
3. **Given** MA50 > MA200인 종목, **When** 상세 페이지 로드, **Then** "골든크로스" 뱃지가 표시된다.
4. **Given** 이평선 데이터가 없는 종목, **When** 상세 페이지 로드, **Then** 이평선 섹션은 "-" 또는 "데이터 없음"으로 표시된다.

---

### User Story 4 - 포트폴리오 추가/제거 (Priority: P1)

사용자가 상세 페이지에서 해당 종목을 포트폴리오에 추가하거나 제거할 수 있다.

**Why this priority**: 기존 `usePortfolio` 훅을 재사용하여 빠르게 구현 가능하고, 사용자 워크플로우에 필수.

**Independent Test**: 포트폴리오 버튼 클릭 시 상태가 토글되고, 새로고침 후에도 유지되는지 확인.

**Acceptance Scenarios**:

1. **Given** 포트폴리오에 없는 종목, **When** 포트폴리오 버튼 클릭, **Then** 버튼이 활성화 상태로 변경되고 종목이 추가된다.
2. **Given** 포트폴리오에 있는 종목, **When** 포트폴리오 버튼 클릭, **Then** 버튼이 비활성화 상태로 변경되고 종목이 제거된다.
3. **Given** 포트폴리오 토글 후, **When** 페이지 새로고침, **Then** 변경된 상태가 유지된다.

---

### User Story 5 - 밸류에이션 지표 표시 (Priority: P2)

사용자가 P/E, PEG, P/S, P/B, EV/EBITDA 등 밸류에이션 지표를 확인할 수 있다.

**Why this priority**: 투자 판단에 중요한 지표이며, `quarterlyRatios` 테이블에 데이터 존재.

**Independent Test**: 최신 분기 ratio 데이터가 조회되고 올바르게 포맷되어 표시되는지 확인.

**Acceptance Scenarios**:

1. **Given** ratio 데이터가 있는 종목, **When** 상세 페이지 로드, **Then** P/E, PEG, P/S, P/B가 표시된다.
2. **Given** 특정 ratio가 null인 종목, **When** 상세 페이지 로드, **Then** 해당 필드는 "-"로 표시된다.
3. **Given** 음수 P/E인 종목, **When** 상세 페이지 로드, **Then** 음수 값이 그대로 표시되거나 "N/A"로 처리된다(NEEDS CLARIFICATION).

---

### User Story 6 - 수익성 지표 표시 (Priority: P2)

사용자가 매출총이익률, 영업이익률, 순이익률, 배당수익률을 확인할 수 있다.

**Why this priority**: 기업의 수익성 평가에 필수적인 지표.

**Acceptance Scenarios**:

1. **Given** 마진 데이터가 있는 종목, **When** 상세 페이지 로드, **Then** 각 마진이 퍼센트 형식으로 표시된다.
2. **Given** 배당 데이터가 있는 종목, **When** 상세 페이지 로드, **Then** 배당수익률과 배당성향이 표시된다.

---

### User Story 7 - 분기별 실적 차트 (Priority: P3)

사용자가 최근 8개 분기의 매출, 순이익, EPS 추이를 차트로 확인할 수 있다.

**Why this priority**: 기존 테이블의 미니 차트를 확대하여 트렌드를 더 명확히 파악할 수 있게 함.

**Acceptance Scenarios**:

1. **Given** 분기별 재무 데이터가 있는 종목, **When** 상세 페이지 로드, **Then** 매출/순이익/EPS 차트가 표시된다.
2. **Given** 차트 데이터에서 특정 분기가 null, **When** 차트 렌더링, **Then** 해당 분기는 빈 값 또는 0으로 처리된다.
3. **Given** 분기별 데이터가 8개 미만인 종목, **When** 차트 렌더링, **Then** 존재하는 데이터만 표시된다.

---

### User Story 8 - 주가 히스토리 차트 (Priority: P4)

사용자가 일봉 주가 차트와 이동평균선을 시각적으로 확인할 수 있다.

**Why this priority**: 기술적 분석의 핵심이지만, 차트 라이브러리 선정 및 구현 복잡도가 높아 후순위.

**Acceptance Scenarios**:

1. **Given** 일별 가격 데이터가 있는 종목, **When** 상세 페이지 로드, **Then** 캔들스틱 또는 라인 차트가 표시된다.
2. **Given** 차트에서 이평선 표시 토글, **When** 토글 활성화, **Then** MA20/50/100/200이 오버레이된다.
3. **Given** 차트 기간 선택(1M/3M/6M/1Y), **When** 기간 변경, **Then** 해당 기간의 데이터만 차트에 표시된다.

---

### User Story 9 - 동종업계 비교 (Priority: P4)

사용자가 동일 섹터 내 다른 종목과 주요 지표를 비교할 수 있다.

**Why this priority**: 상대적 가치 평가에 유용하지만, 추가 쿼리 및 UI 복잡도가 높음.

**Acceptance Scenarios**:

1. **Given** 섹터 정보가 있는 종목, **When** 동종업계 비교 탭 클릭, **Then** 같은 섹터의 상위 N개 종목이 표시된다.
2. **Given** 비교 테이블, **When** 렌더링, **Then** 시가총액, P/E, RS Score 등 주요 지표가 비교 가능하다.

---

## Edge Cases

- **존재하지 않는 심볼**: 404 페이지 또는 에러 메시지 표시.
- **데이터가 전혀 없는 종목**: 각 섹션별로 "데이터 없음" 표시, 페이지 자체는 정상 렌더링.
- **ETF/펀드 종목**: 일부 지표(EPS, 마진 등)가 의미 없을 수 있음 - 해당 섹션 숨김 또는 별도 처리.
- **상장폐지/거래중단 종목**: `isActivelyTrading=false`인 경우 경고 배너 표시.
- **최신 데이터 미반영**: 마지막 ETL 실행 일자를 표시하여 데이터 신선도 안내.

---

## Requirements _(mandatory)_

### Functional Requirements

#### Phase 1 (MVP)
- **FR-001**: `/stock/[symbol]` 동적 라우트를 생성해야 한다.
- **FR-002**: 종목 기본 정보 API(`/api/stock/[symbol]`)를 구현해야 한다.
- **FR-003**: 헤더에 티커, 회사명, 섹터, 포트폴리오 버튼을 표시해야 한다.
- **FR-004**: 가격 카드에 현재가, 시가총액, RS Score를 표시해야 한다.
- **FR-005**: 이평선 상태(정배열, 골든크로스)를 뱃지로 표시해야 한다.
- **FR-006**: 스크리너 테이블의 티커 링크를 상세 페이지로 연결해야 한다.

#### Phase 2
- **FR-007**: 밸류에이션 섹션에 P/E, PEG, P/S, P/B, EV/EBITDA를 표시해야 한다.
- **FR-008**: 수익성 섹션에 마진율(gross/operating/net)을 표시해야 한다.
- **FR-009**: 재무 건전성 섹션에 부채비율, 이자보상배율을 표시해야 한다.
- **FR-010**: 배당 섹션에 배당수익률, 배당성향을 표시해야 한다.

#### Phase 3
- **FR-011**: 분기별 매출 차트를 대형으로 표시해야 한다.
- **FR-012**: 분기별 순이익/EPS 차트를 표시해야 한다.
- **FR-013**: 영업현금흐름, 잉여현금흐름 차트를 표시해야 한다.

#### Phase 4
- **FR-014**: 일봉 주가 차트를 표시해야 한다(라이브러리 선정 필요).
- **FR-015**: 차트에 이동평균선 오버레이를 지원해야 한다.
- **FR-016**: 동일 섹터 종목 비교 테이블을 제공해야 한다.

### Non-Functional Requirements

- **NFR-001**: 상세 페이지 초기 로드 시간은 2초 이내여야 한다.
- **NFR-002**: 모바일 반응형 레이아웃을 지원해야 한다.
- **NFR-003**: SEO를 위해 메타 태그(title, description)를 동적으로 설정해야 한다.

### Key Entities

- **symbols**: 기본 정보 소스 (companyName, sector, industry, marketCap, exchange, beta, isEtf, isActivelyTrading)
- **dailyPrices**: 가격 데이터 (close, rsScore)
- **dailyMa**: 이동평균선 (ma20, ma50, ma100, ma200)
- **quarterlyFinancials**: 분기별 실적 (revenue, netIncome, epsDiluted, operatingCashFlow, freeCashFlow)
- **quarterlyRatios**: 밸류에이션/수익성 지표 (peRatio, pegRatio, grossMargin, opMargin, netMargin, divYield 등)

---

## Success Criteria _(mandatory)_

### Phase 1 (MVP)
- **SC-001**: `/stock/AAPL` 접근 시 AAPL 종목 정보가 정상 표시된다.
- **SC-002**: 스크리너 테이블 티커 클릭 시 상세 페이지로 이동한다.
- **SC-003**: 포트폴리오 버튼이 정상 동작한다.
- **SC-004**: 존재하지 않는 심볼 접근 시 에러 처리가 된다.
- **SC-005**: 기존 빌드/테스트가 모두 통과한다.

### Phase 2
- **SC-006**: 밸류에이션 지표가 올바른 포맷으로 표시된다.
- **SC-007**: null 값인 지표는 "-"로 표시된다.

### Phase 3
- **SC-008**: 분기별 차트가 최대 8개 분기 데이터를 표시한다.
- **SC-009**: 기존 미니 차트와 데이터가 일치한다.

### Phase 4
- **SC-010**: 주가 차트가 정상 렌더링되고 기간 변경이 동작한다.
- **SC-011**: 동종업계 비교에서 같은 섹터 종목만 표시된다.

---

## Open Questions / NEEDS CLARIFICATION

1. 음수 P/E 표시 방식: 그대로 표시 vs "N/A" vs 별도 스타일?
2. ETF/펀드 종목의 재무 지표 처리 방식?
3. 주가 차트 라이브러리 선정: Recharts(기존) vs Lightweight Charts vs TradingView?
4. 동종업계 비교 시 표시할 종목 수와 정렬 기준?
5. 외부 링크(Seeking Alpha, Yahoo Finance 등) 포함 여부?

