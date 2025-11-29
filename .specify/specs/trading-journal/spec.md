# Feature Specification: 매매일지 (Trading Journal)

**Feature Branch**: `feature/trading-journal`  
**Created**: 2025-11-29
**Status**: Draft

## Overview

수기 매매일지 시스템. 분할 매수/매도, 피라미딩, 트레일링 스탑 등의 매매 내역을 기록하고, 진입 이유와 복기를 통해 매매 실력을 개선한다.

### Core Concepts

- **Trade (매매 건)**: 한 종목을 사고 팔아서 완전히 끝날 때까지의 "하나의 에피소드"
- **Action (매매 내역)**: 실제 매수/매도 거래 (분할 매수/매도 지원)
- **R-Multiple**: 손익 / 최초 리스크(진입가 - 손절가) - 매매 성과 측정 지표

### Breaking Changes

| 변경 사항         | Before                  | After                        |
| ----------------- | ----------------------- | ---------------------------- |
| 포트폴리오 테이블 | `portfolio` (보유 종목) | `watchlist` (관심 종목)      |
| 포트폴리오 개념   | 수동 추가 목록          | 매매일지 기반 현재 보유 종목 |

### Implementation Phases

| Phase   | 범위                                | 우선순위 |
| ------- | ----------------------------------- | -------- |
| Phase 1 | DB 스키마 + API + 기본 CRUD         | P1 (MVP) |
| Phase 2 | 매매 기록 UI (신규 매매, 액션 추가) | P2       |
| Phase 3 | 매매 복기 + 통계 대시보드           | P3       |
| Phase 4 | 포트폴리오 리네이밍 (→ 관심종목)    | P4       |

---

## DB Schema

### 1. `trades` 테이블 (매매 건 / 일기장)

```sql
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT '0',        -- 0 = 관리자(나), 추후 인증 연동용
    symbol TEXT NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'OPEN',      -- OPEN | CLOSED

    -- [Plan] 진입 시 작성
    strategy TEXT,                            -- 매매 기법 (눌림목, 돌파, 뇌동매매 등)
    plan_entry_price NUMERIC(12, 2),          -- 계획 진입가
    plan_stop_loss NUMERIC(12, 2),            -- 최초 손절가 (R 계산용)
    plan_target_price NUMERIC(12, 2),         -- 1차 목표가 (하위호환)
    plan_targets JSONB,                       -- n차 목표가 [{price, weight}]
    entry_reason TEXT,                        -- 진입 근거 (일기)
    commission_rate NUMERIC(6, 4) DEFAULT 0.07, -- 수수료율 (%, 기본 0.07%)

    -- [Result] 청산 후 업데이트
    final_pnl NUMERIC(12, 2),                 -- 최종 손익금 ($, 수수료 차감)
    final_roi NUMERIC(8, 4),                  -- 최종 수익률 (소수점, 예: 0.1234 = 12.34%)
    final_r_multiple NUMERIC(8, 2),           -- R-Multiple (손익 / 리스크)

    -- [Review] 복기
    mistake_type TEXT,                        -- 실수 태그 (추격매수, 손절지연, 원칙준수 등)
    review_note TEXT,                         -- 배운 점 / 멘탈 상태

    -- Timestamps
    start_date TIMESTAMP WITH TIME ZONE,      -- 첫 진입일
    end_date TIMESTAMP WITH TIME ZONE,        -- 완전 청산일
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_trades_user_status ON trades(user_id, status);
CREATE INDEX idx_trades_user_symbol ON trades(user_id, symbol);
CREATE INDEX idx_trades_start_date ON trades(start_date DESC);
```

### 2. `trade_actions` 테이블 (매수/매도 내역)

```sql
CREATE TABLE trade_actions (
    id SERIAL PRIMARY KEY,
    trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,

    action_type TEXT NOT NULL,                -- BUY | SELL
    action_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    price NUMERIC(12, 2) NOT NULL,            -- 체결 가격
    quantity INTEGER NOT NULL,                -- 수량

    note TEXT,                                -- 비고 (예: "2R 익절", "손절")

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_trade_actions_trade_id ON trade_actions(trade_id);
CREATE INDEX idx_trade_actions_date ON trade_actions(action_date DESC);
```

### 3. `watchlist` 테이블 (기존 portfolio 리네이밍)

```sql
-- 기존 portfolio 테이블을 watchlist로 리네이밍
ALTER TABLE portfolio RENAME TO watchlist;
ALTER INDEX idx_portfolio_session RENAME TO idx_watchlist_session;
ALTER TABLE watchlist RENAME CONSTRAINT uq_portfolio_session_symbol TO uq_watchlist_session_symbol;
```

---

## User Scenarios & Testing

### User Story 1 - 신규 매매 진입 (Priority: P1)

사용자가 새로운 종목에 진입할 때 매매 기록을 생성한다.

**Acceptance Scenarios**:

1. **Given** 종목 상세 페이지, **When** "매매 시작" 버튼 클릭, **Then** 신규 매매 모달이 열린다.
2. **Given** 신규 매매 모달, **When** 손절가/진입이유 입력 후 제출, **Then** trades 레코드가 생성되고 status=OPEN.
3. **Given** 매매 생성 완료, **When** 첫 매수 기록 추가, **Then** trade_actions에 BUY 레코드 생성.

---

### User Story 2 - 분할 매수/매도 기록 (Priority: P1)

사용자가 진행 중인 매매에 추가 매수 또는 매도를 기록한다.

**Acceptance Scenarios**:

1. **Given** OPEN 상태의 매매, **When** "매수 추가" 클릭, **Then** BUY action이 추가된다.
2. **Given** OPEN 상태의 매매, **When** "매도 추가" 클릭 + 수량/가격 입력, **Then** SELL action이 추가된다.
3. **Given** 매도 후 보유수량=0, **When** 확인, **Then** 매매 종료 여부를 묻고 status=CLOSED로 변경 가능.

---

### User Story 3 - 평단가/보유수량 자동 계산 (Priority: P1)

시스템이 매수/매도 내역을 기반으로 평균 진입가와 현재 보유 수량을 계산한다.

**Acceptance Scenarios**:

1. **Given** 여러 BUY actions, **When** 매매 상세 조회, **Then** 가중평균 평단가가 표시된다.
2. **Given** BUY 100주 + SELL 50주, **When** 매매 상세 조회, **Then** 현재 보유수량=50으로 표시.
3. **Given** 전량 매도, **When** 보유수량=0, **Then** status 변경 프롬프트 표시.

---

### User Story 4 - 매매 종료 및 복기 (Priority: P2)

사용자가 매매를 종료하고 복기 내용을 기록한다.

**Acceptance Scenarios**:

1. **Given** OPEN 매매 + 전량 매도, **When** "매매 종료" 클릭, **Then** 복기 모달이 열린다.
2. **Given** 복기 모달, **When** 실수태그/리뷰노트 입력, **Then** trades 레코드 업데이트.
3. **Given** 종료된 매매, **When** 조회, **Then** 최종 손익금/수익률/R-Multiple이 표시된다.

---

### User Story 5 - 매매 내역 조회 (Priority: P2)

사용자가 진행 중인 매매와 완료된 매매를 조회한다.

**Acceptance Scenarios**:

1. **Given** 매매일지 페이지, **When** 로드, **Then** OPEN 매매 목록이 먼저 표시된다.
2. **Given** 필터=CLOSED, **When** 적용, **Then** 완료된 매매만 표시된다.
3. **Given** 매매 카드 클릭, **When** 상세 페이지 이동, **Then** 모든 actions이 타임라인으로 표시된다.

---

### User Story 6 - 매매 통계 대시보드 (Priority: P3)

사용자가 매매 통계(승률, 평균 R, 실수 유형별 분석)를 확인한다.

**Acceptance Scenarios**:

1. **Given** 대시보드 페이지, **When** 로드, **Then** 총 매매수, 승률, 평균 R-Multiple 표시.
2. **Given** 실수태그 데이터, **When** 분석, **Then** 가장 많은 실수 유형 Top 3 표시.
3. **Given** 기간 필터, **When** 월별/분기별 선택, **Then** 해당 기간 통계만 표시.

---

### User Story 7 - 관심종목(Watchlist) (Priority: P4)

기존 포트폴리오 기능이 관심종목으로 리네이밍된다.

**Acceptance Scenarios**:

1. **Given** 기존 /portfolio 페이지, **When** 접근, **Then** /watchlist로 리다이렉트.
2. **Given** 종목 상세 페이지, **When** "관심종목 추가" 버튼 클릭, **Then** watchlist에 추가.
3. **Given** 관심종목 페이지, **When** 로드, **Then** 저장된 관심종목 목록 표시.

---

## Edge Cases

- **동일 종목 중복 매매**: 같은 종목에 대해 여러 OPEN 매매가 있을 수 있음 (의도된 설계)
- **매수 없이 매도**: 숏 포지션은 현재 미지원, 첫 action은 BUY 강제
- **0원 매수/매도**: 가격 ≤ 0 은 validation 에러
- **음수 수량**: 수량 ≤ 0 은 validation 에러
- **CLOSED 매매 수정**: 복기 내용만 수정 가능, actions 추가 불가
- **trades.symbol 삭제**: symbols 테이블에서 삭제 시 CASCADE로 매매 기록도 삭제

---

## Requirements

### Functional Requirements

#### Phase 1 (MVP) - DB & API

- **FR-001**: trades 테이블을 생성해야 한다.
- **FR-002**: trade_actions 테이블을 생성해야 한다.
- **FR-003**: 매매 CRUD API (`/api/trades`) 를 구현해야 한다.
- **FR-004**: 매매 내역 CRUD API (`/api/trades/[id]/actions`) 를 구현해야 한다.
- **FR-005**: 평균 진입가, 보유수량 계산 로직을 구현해야 한다.
- **FR-006**: 손익금, 수익률, R-Multiple 계산 로직을 구현해야 한다 (수수료 반영).
- **FR-006-1**: n차 목표가(plan_targets) 저장 및 조회를 구현해야 한다.
- **FR-006-2**: 수수료율(commission_rate) 저장 및 손익 계산에 반영해야 한다.

#### Phase 2 - UI

- **FR-007**: 매매 시작 모달을 구현해야 한다 (n차 목표가 + 수수료율 입력 포함).
- **FR-008**: 매수/매도 추가 폼을 구현해야 한다 (날짜 입력 포함).
- **FR-009**: 매매 종료 + 복기 모달을 구현해야 한다.
- **FR-010**: 매매 목록 페이지를 구현해야 한다 (가격 바 차트, 스켈레톤 로딩 포함).
- **FR-010-1**: 매매 카드에 손절가/목표가 시각화 바 차트를 구현해야 한다.
- **FR-010-2**: 현재가 위치를 바 차트에 표시하고 평단가 대비 퍼센트를 표시해야 한다.
- **FR-011**: 매매 상세 페이지 (액션 타임라인) 를 구현해야 한다.

#### Phase 3 - 통계

- **FR-012**: 매매 통계 대시보드 페이지를 구현해야 한다.
- **FR-013**: 승률, 평균 R, 손익 합계 계산을 구현해야 한다.
- **FR-014**: 실수 유형별 분석 차트를 구현해야 한다.
- **FR-015**: 기간별 필터링을 구현해야 한다.

#### Phase 4 - Watchlist Migration

- **FR-016**: portfolio 테이블을 watchlist로 리네이밍해야 한다.
- **FR-017**: /portfolio → /watchlist URL 리다이렉트를 구현해야 한다.
- **FR-018**: UI 텍스트를 "포트폴리오" → "관심종목"으로 변경해야 한다.

### Non-Functional Requirements

- **NFR-001**: 모든 API 응답 시간은 500ms 이내여야 한다.
- **NFR-002**: user_id 기반 데이터 격리가 가능해야 한다 (추후 인증 연동 대비).
- **NFR-003**: 매매 데이터는 soft delete 하지 않고 hard delete 한다 (사용자 요청 시).

---

## Key Entities & Relationships

```
symbols (1) ←→ (N) trades
trades (1) ←→ (N) trade_actions

user_id → 추후 users 테이블과 연결 (현재는 'default' 또는 session_id 사용)
```

---

## API Endpoints

### Trades API

| Method | Endpoint                 | Description                           |
| ------ | ------------------------ | ------------------------------------- |
| GET    | `/api/trades`            | 매매 목록 조회 (status 필터 지원)     |
| POST   | `/api/trades`            | 신규 매매 생성                        |
| GET    | `/api/trades/[id]`       | 매매 상세 조회 (actions 포함)         |
| PATCH  | `/api/trades/[id]`       | 매매 수정 (복기 등)                   |
| DELETE | `/api/trades/[id]`       | 매매 삭제                             |
| POST   | `/api/trades/[id]/close` | 매매 종료 (status=CLOSED + 결과 계산) |

### Trade Actions API

| Method | Endpoint                              | Description    |
| ------ | ------------------------------------- | -------------- |
| GET    | `/api/trades/[id]/actions`            | 매매 내역 조회 |
| POST   | `/api/trades/[id]/actions`            | 매수/매도 추가 |
| DELETE | `/api/trades/[id]/actions/[actionId]` | 내역 삭제      |

### Statistics API

| Method | Endpoint            | Description    |
| ------ | ------------------- | -------------- |
| GET    | `/api/trades/stats` | 매매 통계 조회 |

---

## Success Criteria

### Phase 1

- **SC-001**: trades, trade_actions 테이블이 생성된다.
- **SC-002**: CRUD API가 정상 동작한다.
- **SC-003**: 평단가/보유수량 계산이 정확하다.

### Phase 2

- **SC-004**: 매매 시작/종료 플로우가 완성된다.
- **SC-005**: 분할 매수/매도 기록이 가능하다.
- **SC-006**: 액션 타임라인이 표시된다.

### Phase 3

- **SC-007**: 승률/평균R 통계가 표시된다.
- **SC-008**: 실수 유형 분석이 가능하다.

### Phase 4

- **SC-009**: portfolio → watchlist 마이그레이션 완료.
- **SC-010**: 기존 기능에 영향 없음.

---

## Open Questions / NEEDS CLARIFICATION

1. ~~**user_id 처리**~~: → **결정됨: "0" (관리자/나)**
2. ~~**R-Multiple 계산 시점**~~: → **결정됨: 매매 종료 시 한 번 계산**
3. ~~**실수 태그**~~: → **결정됨: 미리 정의된 태그만 사용**
4. ~~**기존 포트폴리오 데이터 마이그레이션**~~: → **결정됨: watchlist로 자동 이전**
5. **동일 종목 다중 매매 UI 처리**: 어떤 매매에 액션을 추가할지 선택 방법?

---

## Strategy Tags (Predefined)

참고용 전략 태그:

- 눌림목
- 돌파
- 역추세 (바닥 잡기)
- 실적 발표
- 뇌동매매
- 기타

## Mistake Tags (Predefined)

참고용 실수 태그:

- 원칙준수 ✅
- 추격매수
- 손절지연
- 조급한 익절
- 포지션 과다
- 뇌동매매
- 기타
