# Implementation Tasks: NYSE, AMEX 거래소 추가

**Feature Branch**: `feature/add-nyse-amex`  
**Plan Version**: 1.0  
**Created**: 2025-11-29  
**Status**: Completed

---

## Task Overview

| Phase | 태스크 수 | 완료 | 진행률 |
|-------|----------|------|--------|
| Phase 1 | 3 | 3 | 100% |
| Phase 2 | 2 | 2 | 100% |
| **Total** | **5** | **5** | **100%** |

---

## Phase 1: ETL 수정

**Priority: P1 - 필수**

| ID | Task | Status | 비고 |
|----|------|--------|------|
| T101 | SUPPORTED_EXCHANGES 상수 정의 | [x] | NASDAQ, NYSE, AMEX |
| T102 | 거래소별 API 호출 로직 | [x] | for loop으로 개별 호출 |
| T103 | 필터 조건 수정 | [x] | exchangeShortName 체크 |

### Phase 1 완료 조건

- [x] 3개 거래소 모두 조회
- [x] 기존 필터링 로직 유지

---

## Phase 2: 검증 및 문서화

**Priority: P1 - 필수**

| ID | Task | Status | 비고 |
|----|------|--------|------|
| T201 | ETL 실행 및 결과 확인 | [x] | 7119 심볼 저장 |
| T202 | README 업데이트 | [x] | NASDAQ → NASDAQ, NYSE, AMEX |

### Phase 2 완료 조건

- [x] BMNR (AMEX) 조회 가능
- [x] lint/test/build 통과
- [x] 문서 업데이트 완료

