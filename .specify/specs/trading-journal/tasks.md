# Implementation Tasks: 매매일지 (Trading Journal)

**Feature Branch**: `feature/trading-journal`  
**Plan Version**: 1.0  
**Created**: 2025-11-28  
**Status**: Draft

---

## Task Overview

| Phase     | 태스크 수 | 완료   | 진행률  |
| --------- | --------- | ------ | ------- |
| Phase 1   | 21        | 20     | 95%     |
| Phase 2   | 18        | 18     | 100%    |
| Phase 3   | 8         | 8      | 100%    |
| Phase 4   | 8         | 0      | 0%      |
| **Total** | **55**    | **46** | **84%** |

---

## Phase 1: DB 스키마 + API (MVP)

**Priority: P1 - 필수**

### User Story 1, 2, 3 - 기본 CRUD

| ID   | Task                                                   | Status | 연관 FR    |
| ---- | ------------------------------------------------------ | ------ | ---------- |
| T101 | Drizzle 스키마에 trades 테이블 정의 추가               | [x]    | FR-001     |
| T102 | Drizzle 스키마에 trade_actions 테이블 정의 추가        | [x]    | FR-002     |
| T103 | DB 마이그레이션 실행 (`yarn db:push`)                  | [ ]    | FR-001,002 |
| T104 | Trade 타입 정의 (`lib/trades/types.ts`)                | [x]    | FR-003     |
| T105 | GET /api/trades - 매매 목록 조회                       | [x]    | FR-003     |
| T106 | POST /api/trades - 신규 매매 생성                      | [x]    | FR-003     |
| T107 | GET /api/trades/[id] - 매매 상세 조회 (actions 포함)   | [x]    | FR-003     |
| T108 | PATCH /api/trades/[id] - 매매 수정                     | [x]    | FR-003     |
| T109 | DELETE /api/trades/[id] - 매매 삭제                    | [x]    | FR-003     |
| T110 | POST /api/trades/[id]/actions - 매수/매도 추가         | [x]    | FR-004     |
| T111 | DELETE /api/trades/[id]/actions/[actionId] - 내역 삭제 | [x]    | FR-004     |
| T112 | POST /api/trades/[id]/close - 매매 종료 + 결과 계산    | [x]    | FR-003,006 |

### 계산 로직 유틸

| ID   | Task                                     | Status | 연관 FR  |
| ---- | ---------------------------------------- | ------ | -------- |
| T113 | 평균 진입가 계산 함수                    | [x]    | FR-005   |
| T114 | 현재 보유수량 계산 함수                  | [x]    | FR-005   |
| T115 | 최종 손익금(PnL) 계산 함수 (수수료 반영) | [x]    | FR-006   |
| T116 | 수익률(ROI) 계산 함수                    | [x]    | FR-006   |
| T117 | R-Multiple 계산 함수                     | [x]    | FR-006   |
| T118 | 계산 로직 단위 테스트 작성               | [x]    | -        |
| T119 | n차 목표가(plan_targets) 스키마 추가     | [x]    | FR-006-1 |
| T120 | 수수료율(commission_rate) 스키마 추가    | [x]    | FR-006-2 |
| T121 | 수수료 적용 손익 계산 테스트 추가        | [x]    | FR-006-2 |

#### Phase 1 완료 조건

- [ ] T101-T118 모든 태스크 완료
- [ ] 모든 API 테스트 통과
- [ ] 계산 로직 단위 테스트 통과
- [ ] `yarn lint && yarn test && yarn build` 통과

---

## Phase 2: 매매 기록 UI

**Priority: P2 - 핵심 기능**

### 매매 목록 페이지

| ID   | Task                                             | Status | 연관 FR |
| ---- | ------------------------------------------------ | ------ | ------- |
| T201 | /trades 페이지 라우트 생성                       | [x]    | FR-010  |
| T202 | TradesClient.tsx - 매매 목록 클라이언트 컴포넌트 | [x]    | FR-010  |
| T203 | TradeCard.tsx - 매매 카드 컴포넌트               | [x]    | FR-010  |
| T204 | 상태(OPEN/CLOSED) 필터 구현                      | [x]    | FR-010  |

### 매매 상세 페이지

| ID   | Task                                             | Status | 연관 FR |
| ---- | ------------------------------------------------ | ------ | ------- |
| T205 | /trades/[id] 페이지 라우트 생성                  | [x]    | FR-011  |
| T206 | TradeDetailClient.tsx - 상세 클라이언트 컴포넌트 | [x]    | FR-011  |
| T207 | ActionTimeline.tsx - 액션 타임라인 컴포넌트      | [x]    | FR-011  |

### 신규 매매/액션 폼

| ID   | Task                                    | Status | 연관 FR |
| ---- | --------------------------------------- | ------ | ------- |
| T208 | TradeForm.tsx - 신규 매매 생성 모달     | [x]    | FR-007  |
| T209 | ActionForm.tsx - 매수/매도 추가 폼      | [x]    | FR-008  |
| T210 | 입력값 유효성 검사 (가격 > 0, 수량 > 0) | [x]    | FR-008  |

### 매매 종료

| ID   | Task                                   | Status | 연관 FR |
| ---- | -------------------------------------- | ------ | ------- |
| T211 | TradeCloseModal.tsx - 종료 + 복기 모달 | [x]    | FR-009  |
| T212 | 실수 태그 선택 UI (드롭다운/칩)        | [x]    | FR-009  |

### 통합

| ID   | Task                                     | Status | 연관 FR  |
| ---- | ---------------------------------------- | ------ | -------- |
| T213 | 종목 상세 페이지에 "매매 시작" 버튼 추가 | [x]    | FR-007   |
| T214 | 네비게이션에 "매매일지" 링크 추가        | [x]    | -        |
| T215 | 스켈레톤 로딩 (목록/상세)                | [x]    | FR-010   |
| T216 | n차 목표가 입력 UI (TradeForm)           | [x]    | FR-006-1 |
| T217 | 수수료율 입력 UI + localStorage 저장     | [x]    | FR-006-2 |
| T218 | 가격 바 차트 (손절/평단/현재가/목표가)   | [x]    | FR-010-1 |

#### Phase 2 완료 조건

- [ ] T201-T214 모든 태스크 완료
- [ ] 신규 매매 생성 → 매수/매도 추가 → 종료 플로우 동작
- [ ] 모바일 반응형 레이아웃
- [ ] `yarn lint && yarn test && yarn build` 통과

---

## Phase 3: 통계 대시보드

**Priority: P3 - 고도화**

### 통계 API

| ID   | Task                                  | Status | 연관 FR |
| ---- | ------------------------------------- | ------ | ------- |
| T301 | GET /api/trades/stats - 통계 조회 API | [x]    | FR-013  |
| T302 | 승률 계산 (승리 매매 / 전체 매매)     | [x]    | FR-013  |
| T303 | 평균 R-Multiple 계산                  | [x]    | FR-013  |
| T304 | 실수 유형별 집계                      | [x]    | FR-014  |

### 대시보드 UI

| ID   | Task                             | Status | 연관 FR |
| ---- | -------------------------------- | ------ | ------- |
| T305 | /trades/stats 페이지 라우트 생성 | [x]    | FR-012  |
| T306 | TradeStats.tsx - 통계 요약 카드  | [x]    | FR-012  |
| T307 | 실수 유형별 파이/바 차트         | [x]    | FR-014  |
| T308 | 기간 필터 (월별/분기별/전체)     | [-]    | FR-015  |

#### Phase 3 완료 조건

- [ ] T301-T308 모든 태스크 완료
- [ ] 승률/평균R/손익합계 표시
- [ ] 실수 유형 분석 차트 표시
- [ ] `yarn lint && yarn test && yarn build` 통과

---

## Phase 4: Watchlist 마이그레이션

**Priority: P4 - 리팩토링**

### DB 마이그레이션

| ID   | Task                                           | Status | 연관 FR |
| ---- | ---------------------------------------------- | ------ | ------- |
| T401 | Drizzle 스키마: portfolio → watchlist 리네이밍 | [ ]    | FR-016  |
| T402 | 마이그레이션 SQL 작성 및 실행                  | [ ]    | FR-016  |

### API 변경

| ID   | Task                                                     | Status | 연관 FR |
| ---- | -------------------------------------------------------- | ------ | ------- |
| T403 | /api/watchlist 라우트 생성 (기존 portfolio 복사)         | [ ]    | FR-017  |
| T404 | /api/portfolio → /api/watchlist 리다이렉트 (deprecation) | [ ]    | FR-017  |

### 훅/컴포넌트 변경

| ID   | Task                                          | Status | 연관 FR |
| ---- | --------------------------------------------- | ------ | ------- |
| T405 | usePortfolio → useWatchlist 리네이밍          | [ ]    | FR-018  |
| T406 | 모든 UI 텍스트 "포트폴리오" → "관심종목" 변경 | [ ]    | FR-018  |

### URL 변경

| ID   | Task                               | Status | 연관 FR |
| ---- | ---------------------------------- | ------ | ------- |
| T407 | /watchlist 페이지 라우트 생성      | [ ]    | FR-017  |
| T408 | /portfolio → /watchlist 리다이렉트 | [ ]    | FR-017  |

#### Phase 4 완료 조건

- [ ] T401-T408 모든 태스크 완료
- [ ] 기존 portfolio 데이터가 watchlist로 이전됨
- [ ] 기존 /portfolio URL이 /watchlist로 리다이렉트됨
- [ ] 기존 기능 정상 동작
- [ ] `yarn lint && yarn test && yarn build` 통과

---

## Dependency Graph

```
Phase 1 (필수)
├── T101 → T102 → T103 (스키마)
├── T104 (타입) → T105-T112 (API)
└── T113-T117 (계산) → T118 (테스트)

Phase 2 (UI) ─────────────────────────────→ Phase 1 완료 후
├── T201-T204 (목록)
├── T205-T207 (상세)
├── T208-T210 (폼)
└── T211-T214 (종료/통합)

Phase 3 (통계) ───────────────────────────→ Phase 2 완료 후
├── T301-T304 (API)
└── T305-T308 (UI)

Phase 4 (마이그레이션) ───────────────────→ 독립적 (언제든 가능)
├── T401-T402 (DB)
├── T403-T404 (API)
├── T405-T406 (훅/컴포넌트)
└── T407-T408 (URL)
```

---

## Notes

### 엣지 케이스 체크리스트

- [ ] 첫 진입이 SELL인 경우 에러 처리
- [ ] 가격 ≤ 0 입력 시 validation 에러
- [ ] 수량 ≤ 0 입력 시 validation 에러
- [ ] CLOSED 매매에 action 추가 시도 시 에러
- [ ] 매도 수량 > 보유 수량 시 경고 (숏 미지원)
- [ ] 손절가 미입력 시 R-Multiple 계산 불가 표시

### 테스트 체크리스트

- [ ] 평균 진입가 계산 정확성
- [ ] 분할 매도 후 보유수량 계산
- [ ] 전량 매도 후 손익금 계산
- [ ] R-Multiple 계산 (손절가 기준)
- [ ] 승률 계산 (손익 > 0 기준)
