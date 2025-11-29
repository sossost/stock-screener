# Implementation Plan: 매매일지 (Trading Journal)

**Feature Branch**: `feature/trading-journal`  
**Spec Version**: 1.0  
**Created**: 2025-11-28  
**Status**: Draft

---

## Constitution Check

| 항목                 | 체크    | 비고                                |
| -------------------- | ------- | ----------------------------------- |
| 기존 DB 스키마 영향  | ⚠️      | portfolio → watchlist 리네이밍 필요 |
| 새 테이블 추가       | ✅      | trades, trade_actions               |
| 외부 API 의존성      | ✅ 없음 | 자체 데이터만 사용                  |
| 기존 컴포넌트 재사용 | ✅      | StateMessage, FilterBox 등          |
| 테스트 커버리지      | ✅      | 계산 로직 단위 테스트 필수          |

---

## Project Structure

```
apps/web/src/
├── app/
│   ├── trades/                           # 매매일지 페이지
│   │   ├── page.tsx                      # 매매 목록
│   │   ├── TradesClient.tsx              # 클라이언트 컴포넌트
│   │   └── [id]/
│   │       ├── page.tsx                  # 매매 상세
│   │       └── TradeDetailClient.tsx
│   ├── trades/stats/
│   │   └── page.tsx                      # 통계 대시보드
│   ├── watchlist/                        # 관심종목 (기존 portfolio 이전)
│   │   └── page.tsx
│   └── api/
│       ├── trades/
│       │   ├── route.ts                  # GET/POST
│       │   ├── stats/
│       │   │   └── route.ts              # GET (통계)
│       │   └── [id]/
│       │       ├── route.ts              # GET/PATCH/DELETE
│       │       ├── close/
│       │       │   └── route.ts          # POST (매매 종료)
│       │       └── actions/
│       │           ├── route.ts          # GET/POST
│       │           └── [actionId]/
│       │               └── route.ts      # DELETE
│       └── watchlist/
│           └── route.ts                  # 기존 portfolio API 리네이밍
├── components/
│   └── trades/
│       ├── TradeCard.tsx                 # 매매 카드 컴포넌트
│       ├── TradeForm.tsx                 # 신규 매매 폼
│       ├── ActionForm.tsx                # 매수/매도 폼
│       ├── ActionTimeline.tsx            # 액션 타임라인
│       ├── TradeCloseModal.tsx           # 종료+복기 모달
│       └── TradeStats.tsx                # 통계 요약 카드
├── db/
│   └── schema.ts                         # trades, trade_actions 추가
├── lib/
│   └── trades/
│       ├── calculations.ts               # 평단가, R-Multiple 등 계산
│       └── types.ts                      # Trade, Action 타입
└── hooks/
    └── useTrades.ts                      # 매매 관련 훅
```

---

## Key Technical Decisions

### 1. 스키마 설계

**결정**: 2-테이블 구조 (trades + trade_actions)

**이유**:

- 분할 매수/매도를 자연스럽게 지원
- 매매 건별 복기/태그와 개별 거래 내역 분리
- R-Multiple 계산에 필요한 최초 리스크(손절가) 저장 가능

### 2. user_id 처리

**결정**: 기본값 '0' (관리자/나), 추후 인증 연동 시 실제 사용자 ID로 대체

**이유**:

- 현재는 단일 사용자 시스템
- 스키마를 미리 준비해두면 인증 추가 시 마이그레이션 최소화

### 2-1. 수수료율 처리

**결정**: trades 테이블에 commission_rate 저장, localStorage에 마지막 입력값 캐시

**이유**:

- 사용자마다 수수료율이 다름 (증권사, 계좌 종류에 따라)
- 한 번 입력하면 다음 매매에 자동 적용 (UX 개선)
- 손익 계산 시 정확한 수수료 반영

### 2-2. n차 목표가 (plan_targets)

**결정**: JSONB 필드로 `[{price, weight}]` 배열 저장

**이유**:

- 1차, 2차, n차 목표가 유연하게 지원
- 각 목표가별 비중(%) 설정 가능
- 기존 plan_target_price는 하위호환용으로 유지

### 3. 계산 로직

**결정**: 클라이언트 + API 모두에서 계산 (표시용 vs 저장용)

- **실시간 표시**: 클라이언트에서 계산 (평단가, 보유수량)
- **영구 저장**: 매매 종료 시 API에서 계산 후 저장 (final_pnl, final_roi, final_r_multiple)

### 4. portfolio → watchlist 마이그레이션

**결정**: Phase 4에서 별도 마이그레이션 스크립트 실행

**이유**:

- 기존 기능에 영향을 최소화
- 점진적 이전으로 리스크 감소

---

## Dependencies

### 기존 의존성 (변경 없음)

- Drizzle ORM
- Next.js App Router
- shadcn/ui (Dialog, Form 등)
- Tailwind CSS

### 신규 의존성

- 없음 (기존 스택으로 충분)

---

## Phase Details

### Phase 1: DB 스키마 + API (MVP)

**목표**: 핵심 데이터 구조와 API 완성

**작업**:

1. Drizzle 스키마에 trades, trade_actions 테이블 추가
2. 마이그레이션 실행 (`yarn db:push`)
3. trades CRUD API 구현
4. trade_actions CRUD API 구현
5. 계산 로직 유틸 구현 (calculations.ts)
6. 단위 테스트 작성

**산출물**:

- `apps/web/src/db/schema.ts` (수정)
- `apps/web/src/app/api/trades/...` (신규)
- `apps/web/src/lib/trades/calculations.ts` (신규)
- `apps/web/src/lib/__tests__/trade-calculations.test.ts` (신규)

### Phase 2: 매매 기록 UI

**목표**: 매매 생성/수정/조회 UI 완성

**작업**:

1. 매매 목록 페이지 (/trades)
2. 매매 상세 페이지 (/trades/[id])
3. 신규 매매 모달 (TradeForm)
4. 매수/매도 추가 폼 (ActionForm)
5. 액션 타임라인 (ActionTimeline)
6. 매매 종료 모달 (TradeCloseModal)
7. 종목 상세 페이지에서 매매 시작 버튼 추가

**산출물**:

- `apps/web/src/app/trades/...` (신규)
- `apps/web/src/components/trades/...` (신규)
- `apps/web/src/app/stock/[symbol]/...` (수정)

### Phase 3: 통계 대시보드

**목표**: 매매 성과 분석 기능

**작업**:

1. 통계 API 구현 (/api/trades/stats)
2. 대시보드 페이지 (/trades/stats)
3. 승률/평균R/손익 합계 카드
4. 실수 유형별 파이 차트
5. 월별 손익 추이 차트
6. 기간 필터

**산출물**:

- `apps/web/src/app/trades/stats/page.tsx`
- `apps/web/src/components/trades/TradeStats.tsx`

### Phase 4: Watchlist 마이그레이션

**목표**: 기존 portfolio를 watchlist로 전환

**작업**:

1. DB 마이그레이션 (portfolio → watchlist)
2. API 엔드포인트 변경 (/api/portfolio → /api/watchlist)
3. URL 리다이렉트 (/portfolio → /watchlist)
4. UI 텍스트 변경
5. usePortfolio → useWatchlist 훅 리네이밍

**산출물**:

- 마이그레이션 스크립트
- `apps/web/src/hooks/useWatchlist.ts`
- `apps/web/src/app/watchlist/...`

---

## Risk Assessment

| 리스크                      | 확률 | 영향 | 대응 방안                                      |
| --------------------------- | ---- | ---- | ---------------------------------------------- |
| portfolio 마이그레이션 실패 | 낮음 | 높음 | Phase 4를 별도 브랜치에서 진행, 롤백 계획 수립 |
| R-Multiple 계산 오류        | 중간 | 중간 | 철저한 단위 테스트, 엣지 케이스 검증           |
| 동일 종목 다중 매매 UX 혼란 | 중간 | 낮음 | 명확한 UI 구분, 최신 매매 우선 표시            |

---

## Milestones

| 마일스톤         | 완료 조건                | 예상 기간 |
| ---------------- | ------------------------ | --------- |
| M1: Schema & API | 모든 API 테스트 통과     | 1-2일     |
| M2: Core UI      | 매매 생성/조회/종료 가능 | 2-3일     |
| M3: Stats        | 대시보드 표시            | 1일       |
| M4: Migration    | watchlist 전환 완료      | 1일       |

---

## Open Questions Resolution

추후 작업 시 결정:

1. **user_id**: 일단 'default' 사용, 인증 구현 시 session_id로 전환
2. **R-Multiple**: 매매 종료 시 한 번만 계산하여 저장
3. **실수 태그**: 미리 정의된 태그 + 기타(자유입력) 조합
4. **포트폴리오 마이그레이션**: 자동 이전 (user_id='default')
5. **동일 종목 다중 매매**: 최신 OPEN 매매를 기본 선택, 드롭다운으로 변경 가능
