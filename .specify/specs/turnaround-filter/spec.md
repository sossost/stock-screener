# Feature Specification: 턴어라운드 필터 (직전 분기 흑자 전환)

**Feature Branch**: `feature/turnaround-filter`
**Created**: 2025-11-24
**Status**: Draft
**Input**: 수익성 필터에 EPS 기반 턴어라운드(적자→흑자) 필터 추가. 직전 분기에서 흑자 전환한 종목만 필터링.

## User Scenarios & Testing (prioritized)

### Story 1 (P1): 직전 분기 흑자 전환만 보기
- 최근 분기 EPS > 0, 직전 분기 EPS ≤ 0인 종목만 필터링
- Why: 가장 즉각적인 턴어라운드 종목 탐색
- Acceptance:
  1. EPS[-0] > 0 AND EPS[-1] ≤ 0 → 필터 ON 시 노출
  2. EPS[-0] > 0 AND EPS[-1] > 0 → 필터 ON 시 미노출
  3. EPS[-0] ≤ 0 → 미노출

### Story 2 (P2): 데이터 부족 처리
- EPS 데이터가 부족하거나 결측이면 전환 판정 불가로 제외
- Acceptance: EPS 길이 < 2 또는 NULL/0만 있음 → 필터 ON 시 미노출

### Edge Cases
- EPS 전부 0 또는 NULL → 미포함
- 최근 EPS 양수지만 직전 분기 결측 → 전환 판정 불가 → 미포함
- 파라미터는 단일 토글만 사용(`turnAround=true/false`)

## Requirements

### Functional
- **FR-001**: API 파라미터 `turnAround`(boolean) 지원
- **FR-002**: 필터 조건: EPS[-0] > 0 AND EPS[-1] ≤ 0
- **FR-003**: EPS 데이터가 부족/NULL/0만 존재하면 결과에서 제외
- **FR-004**: 수익성 필터 UI에 턴어라운드 토글 추가
- **FR-005**: 기존 수익성 필터(흑자/적자/전체)와 조합 가능

### Non-Functional
- 쿼리 성능: 최근 2분기 EPS만 사용
- 결측 안전: 데이터 부족 시 graceful하게 제외/NULL 처리

### Key Entities
- 최근 EPS 시계열(최근 2분기) `quarterly_financials.eps_diluted`

## Success Criteria
- SC-001: 필터 ON 시 EPS[-0] > 0 AND EPS[-1] ≤ 0인 종목만 포함
- SC-002: EPS 데이터 부족/결측 종목은 결과에 포함되지 않음
- SC-003: UI 토글 변경 시 정상 필터링·정렬 동작, 오류 없음
