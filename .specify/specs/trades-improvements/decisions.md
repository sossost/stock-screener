# 매매일지 개선 의사결정 기록

**Feature Branch**: `feature/trades-improvements`  
**Created**: 2025-12-03

## ADR-001: 자산흐름 → 수익 흐름(PnL) 변경

**상태**: 승인됨

**배경**: 
통계 페이지의 "자산 흐름" 차트가 총 자산(totalAssets)을 표시하고 있지만, 사용자가 관심 있는 건 순수익(PnL) 변화다.

**결정**:
- 차트 제목을 "자산 흐름"에서 "수익 흐름 (PnL)"로 변경
- 차트 데이터를 `totalAssets` 대신 `realizedPnl` 누적값으로 변경
- 양수는 초록색, 음수는 빨간색으로 표시하여 직관성 향상

**영향**:
- `AssetFlowChart` 컴포넌트를 `PnlFlowChart`로 리네이밍 또는 수정
- `/api/trades/assets` 엔드포인트에 `realizedPnl` 필드 추가
- 기존 자산 스냅샷 데이터는 유지하되, 차트 표시만 변경

## ADR-002: 매수/매도 시 현금 변화 자동 반영

**상태**: 승인됨

**배경**:
매수/매도 액션을 추가해도 `portfolio_settings.cashBalance`가 자동으로 업데이트되지 않아 사용자가 수동으로 현금 잔액을 관리해야 한다.

**결정**:
- 매수 액션 추가 시: `cashBalance -= (price * quantity * (1 + commissionRate))`
- 매도 액션 추가 시: `cashBalance += (price * quantity * (1 - commissionRate))`
- 액션 수정/삭제 시: 기존 액션의 영향을 제거한 후 새 값으로 재계산

**구현 방식**:
- `POST /api/trades/[id]/actions`에서 액션 생성 후 현금 잔액 업데이트
- `PATCH /api/trades/[id]/actions/[actionId]`에서 액션 수정 시 재계산
- `DELETE /api/trades/[id]/actions/[actionId]`에서 액션 삭제 시 재계산
- 트랜잭션 내에서 처리하여 데이터 무결성 보장

**영향**:
- 모든 액션 생성/수정/삭제 API에 현금 잔액 업데이트 로직 추가
- 기존 수동 현금 잔액 관리 기능은 유지 (사용자가 필요시 수정 가능)

## ADR-003: 현재가 표시를 전일대비로 변경

**상태**: 승인됨

**배경**:
진행중 매매 테이블의 "현재가" 컬럼이 평단가 대비 수익률을 표시하고 있지만, 사용자는 전일 대비 변동률을 더 중요하게 생각한다.

**결정**:
- 컬럼 헤더: "현재가 (수익률)" → "현재가 (전일대비)"
- 표시 형식: `$123.45 (+2.3%)` 또는 `$123.45 (-1.5%)`
- 전일 데이터가 없으면 현재가만 표시

**데이터 소스**:
- `daily_prices` 테이블에서 최신 종가와 전일 종가 조회
- 전일대비 계산: `((close - prev_close) / prev_close) * 100`

**영향**:
- `getTradesList` 쿼리에 전일 종가 조회 로직 추가
- `TradeListItem` 타입에 `priceChangePercent` 필드 추가
- `OpenTradesTable` 컴포넌트의 현재가 컬럼 렌더링 로직 수정

## ADR-004: 진행중 매매 자동 완료 처리

**상태**: 승인됨

**배경**:
진행중인 매매에서 모든 보유 수량을 매도해도 수동으로 완료 처리를 해야 한다. 이를 자동화하면 사용자 경험이 개선된다.

**결정**:
- 매도 액션 추가 후 `currentQuantity === 0`이 되면 자동으로 `status = "CLOSED"` 처리
- `endDate`는 마지막 매도 액션의 `actionDate`로 설정
- 완료된 매매는 통계 및 수익 흐름 차트에 자동 반영

**구현 방식**:
- `POST /api/trades/[id]/actions`에서 액션 생성 후 `currentQuantity` 확인
- 0이면 `trades` 테이블 업데이트 (status, endDate)
- 트랜잭션 내에서 처리

**영향**:
- 액션 생성 API에 자동 완료 로직 추가
- 사용자는 수동 완료 버튼을 사용할 수도 있음 (기존 기능 유지)

## ADR-005: URL 기반 탭 관리

**상태**: 승인됨

**배경**:
진행중/완료 탭이 `useState`로 관리되어 브라우저 뒤로가기 시 상태가 유지되지 않는다.

**결정**:
- 탭 상태를 URL 쿼리 파라미터(`?status=OPEN` 또는 `?status=CLOSED`)로 관리
- 기본값은 `OPEN` (쿼리 없을 시)
- `FilterTabs`의 `onChange`에서 `router.push`로 URL 변경

**구현 방식**:
- `TradesClient`에서 `initialStatus`를 `searchParams.status`에서 읽음
- `handleStatusChange`에서 `router.push(`/trades?status=${status}`)` 호출
- 서버 컴포넌트(`page.tsx`)에서 `searchParams.status` 파싱

**영향**:
- 브라우저 히스토리 지원으로 뒤로가기/앞으로가기 동작 개선
- URL 공유 시 특정 탭 상태 유지 가능

## ADR-006: 실현손익 컬럼 추가

**상태**: 승인됨

**배경**:
진행중 매매 테이블에 미실현손익만 표시되고 있지만, 사용자는 이미 실현한 손익도 함께 보고 싶어 한다.

**결정**:
- 진행중 매매 테이블에 "실현 손익" 컬럼 추가
- 위치: 미실현손익 컬럼 오른쪽
- 값: `calculated.realizedPnl`
- 표시 형식: `$+1,234.56` (양수: 초록색, 음수: 빨간색)

**영향**:
- `OpenTradesTable` 컴포넌트에 실현손익 컬럼 추가
- 테이블 너비 조정 필요 (반응형 고려)

## ADR-007: 수익 흐름 차트 로딩 상태 개선

**상태**: 승인됨  
**일자**: 2025-01-27

**배경**:
수익 흐름(PnL) 차트가 초기 렌더링 시 불필요하게 로딩 상태를 표시하여 사용자 경험이 저하되었다.

**결정**:
- 초기 로딩 상태를 `false`로 변경
- 기간 변경 시에만 로딩 상태 표시
- 데이터가 있으면 즉시 그래프 렌더링

**구현**:
- `AssetFlowChart` 컴포넌트의 `useState<boolean>(true)` → `useState<boolean>(false)` 변경
- 기간 변경 시에만 `setLoading(true)` 호출

**영향**:
- `apps/web/src/components/trades/charts/AssetFlowChart.tsx` 수정
- 사용자가 차트를 더 빠르게 볼 수 있다

## ADR-008: 호버 팝업 레전드 순서 개선

**상태**: 승인됨  
**일자**: 2025-01-27

**배경**:
매매 리스트의 호버 팝업에서 현재가가 목표가보다 높을 때, 레전드에서 현재가가 목표가 앞에 표시되어 시각적 혼란을 야기했다.

**결정**:
- 현재가가 모든 목표가보다 높으면 현재가를 레전드의 가장 오른쪽(맨 마지막)에 배치
- 그렇지 않으면 기존 순서 유지 (손절 → 평단 → 현재 → 목표)

**구현**:
- `PriceBarLegend` 컴포넌트에서 최대 목표가와 현재가 비교
- 조건에 따라 현재가 항목을 동적으로 배치

**영향**:
- `apps/web/src/components/trades/charts/PriceBarLegend.tsx` 수정
- 사용자가 가격 관계를 더 직관적으로 파악할 수 있다
