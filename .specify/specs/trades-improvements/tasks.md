# Tasks: 매매일지 개선

**Input**: Design documents from `/specs/trades-improvements/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: API 테스트 및 통합 테스트 포함

**Organization**: 기능별로 그룹화하여 독립적 구현 및 테스트 가능

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 사용자 스토리 (US1, US2, US3, US4, US5, US6)
- 파일 경로를 설명에 포함

## Path Conventions

- **Next.js 프로젝트**: `apps/web/src/`
- **API**: `apps/web/src/app/api/trades/`
- **UI**: `apps/web/src/components/trades/`
- **로직**: `apps/web/src/lib/trades/`

---

## Phase 1: 현금 잔액 자동 업데이트

**Purpose**: 매수/매도 액션 발생 시 현금 잔액 자동 업데이트

### Tests

- [ ] T001 [P] [US2] 현금 계산 함수 테스트 작성: `src/lib/trades/__tests__/calculations.test.ts`
  - 매수 시 현금 감소 계산
  - 매도 시 현금 증가 계산
  - 수수료 포함 계산

- [ ] T002 [P] [US2] 액션 생성 API 테스트 작성: `src/app/api/trades/[id]/actions/__tests__/route.test.ts`
  - 매수 액션 생성 시 현금 감소 확인
  - 매도 액션 생성 시 현금 증가 확인
  - 액션 수정 시 현금 재계산 확인
  - 액션 삭제 시 현금 재계산 확인

### Implementation

- [ ] T003 [US2] 현금 계산 함수 작성: `src/lib/trades/calculations.ts`
  ```typescript
  export function calculateCashChange(
    actions: TradeAction[],
    commissionRate: number
  ): number
  ```

- [ ] T004 [US2] 액션 생성 API 수정: `src/app/api/trades/[id]/actions/route.ts`
  - 액션 생성 후 현금 잔액 업데이트
  - 트랜잭션 내에서 처리

- [ ] T005 [US2] 액션 수정 API 수정: `src/app/api/trades/[id]/actions/[actionId]/route.ts`
  - 액션 수정 시 전체 액션 재계산 후 현금 업데이트

- [ ] T006 [US2] 액션 삭제 API 수정: `src/app/api/trades/[id]/actions/[actionId]/route.ts`
  - 액션 삭제 시 전체 액션 재계산 후 현금 업데이트

---

## Phase 2: 현재가(전일대비) 표시

**Purpose**: 진행중 매매 테이블의 현재가 컬럼에 전일대비 변동률 표시

### Tests

- [ ] T007 [P] [US3] 전일 종가 조회 쿼리 테스트 작성: `src/lib/trades/__tests__/queries.test.ts`
  - 전일 종가 조회 로직 검증
  - 전일 데이터 없을 때 처리

- [ ] T008 [P] [US3] OpenTradesTable 컴포넌트 테스트 작성: `src/components/trades/tables/__tests__/OpenTradesTable.test.tsx`
  - 전일대비 변동률 표시 확인
  - 색상 스타일링 확인

### Implementation

- [ ] T009 [US3] 전일 종가 조회 로직 추가: `src/lib/trades/queries.ts`
  - `getTradesList` 함수에 전일 종가 조회 추가
  - 전일대비 변동률 계산

- [ ] T010 [US3] TradeListItem 타입 수정: `src/lib/trades/types.ts`
  - `priceChangePercent: number | null` 필드 추가

- [ ] T011 [US3] OpenTradesTable 컴포넌트 수정: `src/components/trades/tables/OpenTradesTable.tsx`
  - 현재가 컬럼 헤더 변경: "현재가 (수익률)" → "현재가 (전일대비)"
  - 전일대비 변동률 표시 로직 추가
  - 색상 스타일링 (양수: 초록, 음수: 빨강)

---

## Phase 3: 자동 완료 처리

**Purpose**: 진행중인 매매에서 모든 보유 수량 매도 시 자동 완료 처리

### Tests

- [ ] T012 [P] [US4] 자동 완료 로직 테스트 작성: `src/app/api/trades/[id]/actions/__tests__/route.test.ts`
  - 보유 수량 0일 때 자동 완료 확인
  - 완료 후 상태 및 endDate 확인

### Implementation

- [ ] T013 [US4] 액션 생성 API에 자동 완료 로직 추가: `src/app/api/trades/[id]/actions/route.ts`
  - 액션 생성 후 `currentQuantity` 확인
  - 0이면 `status = "CLOSED"`, `endDate` 설정
  - 트랜잭션 내에서 처리

---

## Phase 4: URL 기반 탭 관리

**Purpose**: 진행중/완료 탭 상태를 URL 쿼리 파라미터로 관리

### Tests

- [ ] T014 [P] [US5] TradesClient 컴포넌트 테스트 작성: `src/app/trades/__tests__/TradesClient.test.tsx`
  - URL 쿼리 파라미터로 탭 상태 관리 확인
  - 탭 클릭 시 URL 변경 확인

### Implementation

- [ ] T015 [US5] TradesClient 컴포넌트 수정: `src/app/trades/TradesClient.tsx`
  - `handleStatusChange`에서 `router.push` 사용
  - URL 쿼리 파라미터 기반 탭 상태 관리

- [ ] T016 [US5] 서버 컴포넌트 수정: `src/app/trades/page.tsx`
  - `searchParams.status` 파싱
  - 기본값 `OPEN` 설정

---

## Phase 5: 실현손익 컬럼 추가

**Purpose**: 진행중 매매 테이블에 실현손익 컬럼 추가

### Tests

- [ ] T017 [P] [US6] OpenTradesTable 컴포넌트 테스트 작성: `src/components/trades/tables/__tests__/OpenTradesTable.test.tsx`
  - 실현손익 컬럼 표시 확인
  - 색상 스타일링 확인

### Implementation

- [ ] T018 [US6] OpenTradesTable 컴포넌트 수정: `src/components/trades/tables/OpenTradesTable.tsx`
  - 실현손익 컬럼 추가 (미실현손익 오른쪽)
  - `calculated.realizedPnl` 표시
  - 색상 스타일링 (양수: 초록, 음수: 빨강)

---

## Phase 6: 수익 흐름(PnL) 차트

**Purpose**: 통계 페이지의 자산 흐름 차트를 수익 흐름(PnL) 차트로 변경

### Tests

- [ ] T019 [P] [US1] PnlFlowChart 컴포넌트 테스트 작성: `src/components/trades/charts/__tests__/PnlFlowChart.test.tsx`
  - 수익 흐름 데이터 표시 확인
  - 색상 스타일링 확인

- [ ] T020 [P] [US1] assets API 테스트 작성: `src/app/api/trades/assets/__tests__/route.test.ts`
  - `realizedPnl` 필드 포함 확인

### Implementation

- [ ] T021 [US1] AssetFlowChart 리네이밍 또는 수정: `src/components/trades/charts/PnlFlowChart.tsx`
  - 컴포넌트명 변경 또는 새 컴포넌트 생성
  - 제목 변경: "자산 흐름" → "수익 흐름 (PnL)"
  - 데이터를 `realizedPnl`로 변경
  - 색상 스타일링 (양수: 초록, 음수: 빨강)

- [ ] T022 [US1] assets API 수정: `src/app/api/trades/assets/route.ts`
  - `realizedPnl` 필드 추가
  - 누적 실현 손익 계산 로직 추가

- [ ] T023 [US1] StatsClient 컴포넌트 수정: `src/app/trades/stats/StatsClient.tsx`
  - `AssetFlowChart` → `PnlFlowChart` 변경

---

## Phase 7: UI/UX 개선

**Purpose**: 사용자 경험 개선을 위한 세부 조정

### Implementation

- [x] T024 [US1] 수익 흐름 차트 로딩 상태 개선: `src/components/trades/charts/AssetFlowChart.tsx`
  - 초기 로딩 상태를 `false`로 변경
  - 기간 변경 시에만 로딩 표시

- [x] T025 호버 팝업 레전드 순서 개선: `src/components/trades/charts/PriceBarLegend.tsx`
  - 현재가가 목표가보다 높을 때 현재가를 가장 오른쪽에 배치
  - 조건부 렌더링 로직 추가

## 비기능 요구사항

- [ ] ✅ 모든 API 변경사항은 트랜잭션 내에서 처리
- [ ] ✅ 전일 종가 조회는 기존 쿼리에 JOIN으로 추가하여 성능 최적화
- [ ] ✅ URL 기반 탭 관리로 브라우저 히스토리 지원
- [ ] ✅ 기존 기능과 호환성 유지
- [x] ✅ 수익 흐름 차트 로딩 상태 개선으로 사용자 경험 향상
- [x] ✅ 호버 팝업 레전드 순서 개선으로 가격 관계 직관성 향상

## 환경 변수 체크리스트

- [ ] 기존 환경 변수 유지 (변경 없음)

## 수락 기준

- [ ] 매수/매도 시 현금 잔액이 자동으로 업데이트됨
- [ ] 진행중 매매 테이블에 전일대비 변동률이 표시됨
- [ ] 진행중 매매에서 모든 보유 수량 매도 시 자동 완료됨
- [ ] 브라우저 뒤로가기 시 탭 상태가 유지됨
- [ ] 진행중 매매 테이블에 실현손익 컬럼이 표시됨
- [ ] 통계 페이지의 차트가 수익 흐름(PnL)으로 변경됨
- [ ] 모든 테스트 통과
- [ ] 린트 및 빌드 통과

