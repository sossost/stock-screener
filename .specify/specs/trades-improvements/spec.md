# 매매일지 개선 스펙

**Feature Branch**: `feature/trades-improvements`  
**Created**: 2025-12-03  
**Status**: In Progress

## 목표

매매일지 기능의 사용성과 정확성을 개선하여 더 나은 매매 기록 및 분석 경험을 제공합니다.

## 정의·범위

### 기능 범위

1. **자산흐름 → 수익 흐름(PnL) 변경**: 차트 제목 및 데이터를 자산 총액에서 순수익(PnL)으로 변경
2. **매수/매도 시 현금 변화 반영**: 매수/매도 액션 발생 시 `portfolio_settings.cashBalance` 자동 업데이트
3. **현재가 표시 개선**: 테이블의 "현재가(수익률)" 컬럼을 "현재가(전일대비)"로 변경
4. **진행중 매매 자동 완료**: 진행중인 매매에서 모든 보유 수량을 매도하면 자동으로 완료 처리
5. **URL 기반 탭 관리**: 진행중/완료 탭 상태를 URL 쿼리 파라미터로 관리하여 브라우저 뒤로가기 시 유지
6. **실현손익 컬럼 추가**: 진행중 매매 테이블에 미실현손익 오른쪽에 실현손익 컬럼 추가

### 표시 정보

#### 1. 수익 흐름(PnL) 차트
- **제목**: "자산 흐름" → "수익 흐름 (PnL)"
- **데이터**: `totalAssets` 대신 `realizedPnl` 누적값 표시
- **기간 필터**: 1개월, 3개월, 전체 (기존과 동일)
- **표시 형식**: PnL 금액 (양수: 초록색, 음수: 빨간색)

#### 2. 진행중 매매 테이블 컬럼
- **현재가 컬럼 변경**:
  - 기존: "현재가 (수익률)"
  - 변경: "현재가 (전일대비)"
  - 표시 형식: `$123.45 (+2.3%)` 또는 `$123.45 (-1.5%)`
- **실현손익 컬럼 추가**:
  - 위치: 미실현손익 컬럼 오른쪽
  - 표시 형식: `$+1,234.56` (양수: 초록색, 음수: 빨간색)
  - 값: `calculated.realizedPnl`

#### 3. 완료 매매 테이블
- 변경사항 없음 (이미 실현손익 표시 중)

### 데이터 소스

#### 현금 잔액 업데이트
- **테이블**: `portfolio_settings` (userId별)
- **컬럼**: `cashBalance` (numeric)
- **업데이트 시점**: 
  - 매수 액션 추가 시: `cashBalance -= (price * quantity * (1 + commissionRate))`
  - 매도 액션 추가 시: `cashBalance += (price * quantity * (1 - commissionRate))`
  - 액션 수정/삭제 시: 기존 액션의 영향 제거 후 새 값 반영

#### 전일대비 정보
- **데이터 소스**: `daily_prices` 테이블
- **필요 정보**: 
  - `close`: 현재 종가
  - `prev_close` 또는 전일 `close`: 전일 종가
- **계산**: `((close - prev_close) / prev_close) * 100`

#### 자동 완료 로직
- **조건**: `currentQuantity === 0` (모든 보유 수량 매도 완료)
- **처리**: 
  - `trades.status` → `"CLOSED"`
  - `trades.endDate` → 마지막 매도 액션의 `actionDate`
  - 통계 및 수익 흐름에 자동 반영

## 데이터 모델

### API 요청/응답

#### POST /api/trades/[id]/actions (수정)
```typescript
// 요청: 기존과 동일
interface CreateActionRequest {
  actionType: "BUY" | "SELL";
  price: number;
  quantity: number;
  actionDate?: string;
  note?: string;
}

// 응답: 기존과 동일 + 현금 잔액 업데이트
```

#### GET /api/trades/assets (수정)
```typescript
// 응답 변경
interface AssetSnapshot {
  date: string;
  // 기존
  totalAssets: number;
  cash: number;
  positionValue: number;
  // 추가
  realizedPnl: number; // 누적 실현 손익
}
```

#### GET /api/trades/list (수정)
```typescript
// TradeListItem에 추가
interface TradeListItem {
  // 기존 필드...
  currentPrice: number | null;
  priceChangePercent: number | null; // 전일대비 변동률 (%)
  // calculated는 기존과 동일
}
```

## API 엔드포인트

### 1. POST /api/trades/[id]/actions (수정)
- **기능**: 매수/매도 액션 추가 시 현금 잔액 자동 업데이트
- **로직**:
  1. 액션 생성 (기존 로직)
  2. 현금 잔액 계산 및 업데이트
  3. 보유 수량이 0이 되면 자동 완료 처리

### 2. PATCH /api/trades/[id]/actions/[actionId] (수정)
- **기능**: 액션 수정 시 현금 잔액 재계산 및 업데이트

### 3. DELETE /api/trades/[id]/actions/[actionId] (수정)
- **기능**: 액션 삭제 시 현금 잔액 재계산 및 업데이트

### 4. GET /api/trades/assets (수정)
- **기능**: 자산 스냅샷 조회 시 `realizedPnl` 포함
- **응답**: `AssetSnapshot[]`에 `realizedPnl` 필드 추가

## 페이지 구조

### /trades (수정)
- **URL 쿼리 파라미터**: `?status=OPEN` 또는 `?status=CLOSED`
- **기본값**: `status=OPEN` (쿼리 없을 시)
- **탭 상태**: URL 기반으로 관리 (브라우저 뒤로가기 지원)

### /trades/stats (수정)
- **수익 흐름 차트**: `AssetFlowChart` → `PnlFlowChart`로 변경
- **데이터**: `realizedPnl` 누적값 표시

## UI 구성

### 1. 진행중 매매 테이블 (`OpenTradesTable.tsx`)
- **현재가 컬럼**:
  ```tsx
  <TableCell>
    {currentPrice > 0 && priceChangePercent != null ? (
      <div>
        <span>{formatPrice(currentPrice)}</span>
        <span className={priceChangePercent >= 0 ? "text-green-600" : "text-red-600"}>
          ({formatPercent(priceChangePercent)})
        </span>
      </div>
    ) : (
      "-"
    )}
  </TableCell>
  ```
- **실현손익 컬럼 추가**:
  ```tsx
  <TableHead>실현 손익</TableHead>
  <TableCell>
    <span className={realizedPnl >= 0 ? "text-green-600" : "text-red-600"}>
      {formatPnl(realizedPnl)}
    </span>
  </TableCell>
  ```

### 2. 수익 흐름 차트 (`PnlFlowChart.tsx`)
- **컴포넌트명**: `AssetFlowChart` → `PnlFlowChart`
- **제목**: "자산 흐름" → "수익 흐름 (PnL)"
- **데이터**: `realizedPnl` 누적값
- **색상**: 양수(초록), 음수(빨강), 0(회색)

## 비기능 요구사항

### 성능
- 현금 잔액 업데이트는 트랜잭션 내에서 처리
- 전일대비 계산은 쿼리 시점에 수행 (캐싱 고려)

### 데이터 무결성
- 현금 잔액 업데이트는 원자적으로 처리
- 액션 수정/삭제 시 현금 잔액 재계산

### 사용성
- URL 기반 탭 관리로 브라우저 히스토리 지원
- 자동 완료 시 사용자에게 알림 (선택사항)

## 예시 / 수락 기준

### 1. 자산흐름 → 수익 흐름 변경
- [ ] 통계 페이지의 차트 제목이 "수익 흐름 (PnL)"로 변경됨
- [ ] 차트 데이터가 `realizedPnl` 누적값으로 표시됨
- [ ] 양수는 초록색, 음수는 빨간색으로 표시됨

### 2. 현금 변화 반영
- [ ] 매수 액션 추가 시 현금 잔액이 감소함
- [ ] 매도 액션 추가 시 현금 잔액이 증가함
- [ ] 액션 수정 시 현금 잔액이 올바르게 재계산됨
- [ ] 액션 삭제 시 현금 잔액이 올바르게 재계산됨

### 3. 현재가(전일대비) 표시
- [ ] 진행중 매매 테이블의 현재가 컬럼에 전일대비 변동률이 표시됨
- [ ] 전일대비가 양수면 초록색, 음수면 빨간색으로 표시됨
- [ ] 전일 데이터가 없으면 현재가만 표시됨

### 4. 자동 완료 처리
- [ ] 진행중 매매에서 모든 보유 수량을 매도하면 자동으로 완료됨
- [ ] 완료된 매매는 통계에 반영됨
- [ ] 완료된 매매는 수익 흐름 차트에 반영됨

### 5. URL 기반 탭 관리
- [ ] `/trades?status=OPEN` 접근 시 진행중 탭이 활성화됨
- [ ] `/trades?status=CLOSED` 접근 시 완료 탭이 활성화됨
- [ ] 브라우저 뒤로가기 시 탭 상태가 유지됨
- [ ] 탭 클릭 시 URL이 변경됨

### 6. 실현손익 컬럼 추가
- [ ] 진행중 매매 테이블에 실현손익 컬럼이 미실현손익 오른쪽에 표시됨
- [ ] 실현손익이 양수면 초록색, 음수면 빨간색으로 표시됨
- [ ] 실현손익이 0이면 회색으로 표시됨

## 구현 완료 사항

### 2025-01-27
- ✅ 수익 흐름 차트 로딩 상태 개선: 초기 로딩 상태를 `false`로 변경하여 불필요한 로딩 표시 제거
- ✅ 호버 팝업 레전드 순서 개선: 현재가가 목표가보다 높을 때 현재가를 가장 오른쪽에 배치

