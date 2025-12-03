# 매매일지 개선 구현 계획

**Branch**: `feature/trades-improvements` | **Date**: 2025-12-03 | **Plan**: [link]  
**Input**: 매매일지 개선 스펙 및 작업 목록 기반 구현 계획

## Technical Context

### Current System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Trade Actions  │    │   API Endpoint  │    │   Frontend      │
│   (BUY/SELL)    │───▶│   /api/trades   │───▶│   /trades       │
│                 │    │                 │    │                 │
│ - Create action │    │ - Query trades │    │ - FilterTabs    │
│ - No cash update│    │ - Get prices    │    │ - OpenTrades    │
│                 │    │ - Calculate     │    │ - ClosedTrades │
└─────────────────┘    └─────────────────┘    └─────────────────┘
     사용자 입력            데이터 조회/계산         UI 표시
```

### Target Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Trade Actions  │    │   API Endpoint  │    │   Frontend      │
│   (BUY/SELL)    │───▶│   /api/trades   │───▶│   /trades       │
│                 │    │                 │    │                 │
│ - Create action │    │ - Update cash  │    │ - URL tabs      │
│ - Auto update   │    │ - Auto close   │    │ - Price change  │
│   cash balance  │    │ - Get prev day  │    │ - Realized PnL  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
     트랜잭션 처리          현금/완료 처리          개선된 UI
```

## Constitution Check

### Performance-First ✅

- 현금 잔액 업데이트는 트랜잭션 내에서 처리하여 성능 최적화
- 전일 종가 조회는 기존 쿼리에 JOIN으로 추가하여 추가 쿼리 방지
- URL 기반 탭 관리로 불필요한 상태 관리 제거

### Data Integrity ✅

- 현금 잔액 업데이트는 트랜잭션 내에서 원자적으로 처리
- 액션 수정/삭제 시 현금 잔액 재계산으로 일관성 유지
- 자동 완료 처리 시 데이터 무결성 보장

### Modular & Maintainable ✅

- 현금 잔액 계산 로직을 별도 함수로 분리
- 전일 종가 조회 로직을 재사용 가능한 함수로 추출
- 컴포넌트 리네이밍 및 구조 개선

## Project Structure

```
apps/web/src/
├── app/
│   ├── api/
│   │   └── trades/
│   │       ├── [id]/
│   │       │   └── actions/
│   │       │       └── route.ts              # 현금 업데이트 로직 추가
│   │       └── assets/
│   │           └── route.ts                  # realizedPnl 필드 추가
│   └── trades/
│       ├── page.tsx                          # URL 기반 탭 관리
│       └── stats/
│           └── page.tsx                      # PnlFlowChart 사용
├── components/
│   └── trades/
│       ├── tables/
│       │   └── OpenTradesTable.tsx            # 전일대비, 실현손익 추가
│       └── charts/
│           ├── AssetFlowChart.tsx             # (기존, 유지)
│           └── PnlFlowChart.tsx               # 새 컴포넌트 (또는 AssetFlowChart 수정)
└── lib/
    └── trades/
        ├── calculations.ts                    # 현금 계산 함수 추가
        └── queries.ts                        # 전일 종가 조회 로직 추가
```

## Research

### 1. 현금 잔액 업데이트 로직

**현재 상태**:
- `portfolio_settings` 테이블에 `cashBalance` 저장
- 사용자가 수동으로 업데이트

**개선 방안**:
- 매수 시: `cashBalance -= (price * quantity * (1 + commissionRate))`
- 매도 시: `cashBalance += (price * quantity * (1 - commissionRate))`
- 액션 수정/삭제 시: 전체 액션 재계산 후 현금 잔액 업데이트

**구현 위치**:
- `POST /api/trades/[id]/actions`: 액션 생성 후 현금 업데이트
- `PATCH /api/trades/[id]/actions/[actionId]`: 액션 수정 시 재계산
- `DELETE /api/trades/[id]/actions/[actionId]`: 액션 삭제 시 재계산

### 2. 전일 종가 조회

**데이터 소스**:
- `daily_prices` 테이블
- 최신 종가와 전일 종가를 JOIN으로 조회

**쿼리 예시**:
```sql
WITH latest_prices AS (
  SELECT DISTINCT ON (symbol)
    symbol, close, date
  FROM daily_prices
  WHERE symbol IN (...)
  ORDER BY symbol, date DESC
),
prev_prices AS (
  SELECT DISTINCT ON (symbol)
    symbol, close AS prev_close
  FROM daily_prices
  WHERE symbol IN (...) AND date < (SELECT MAX(date) FROM daily_prices WHERE symbol = ...)
  ORDER BY symbol, date DESC
)
SELECT 
  lp.symbol,
  lp.close,
  pp.prev_close,
  ((lp.close - pp.prev_close) / pp.prev_close) * 100 AS change_percent
FROM latest_prices lp
LEFT JOIN prev_prices pp ON lp.symbol = pp.symbol
```

### 3. 자동 완료 처리

**조건**:
- `currentQuantity === 0` (모든 보유 수량 매도 완료)

**처리**:
- `trades.status` → `"CLOSED"`
- `trades.endDate` → 마지막 매도 액션의 `actionDate`
- 트랜잭션 내에서 처리

### 4. 수익 흐름(PnL) 차트

**데이터 변경**:
- 기존: `totalAssets` (총 자산)
- 변경: `realizedPnl` (누적 실현 손익)

**계산 방식**:
- 각 완료된 매매의 `realizedPnl`을 날짜별로 누적
- `asset_snapshots` 테이블에 `realizedPnl` 필드 추가

## Data Models

### TradeListItem (수정)

```typescript
interface TradeListItem extends Trade {
  companyName: string | null;
  currentPrice: number | null;
  priceChangePercent: number | null; // 전일대비 변동률 (%)
  calculated: {
    // 기존 필드...
    realizedPnl: number; // 실현 손익
  };
}
```

### AssetSnapshot (수정)

```typescript
interface AssetSnapshot {
  date: string;
  totalAssets: number;
  cash: number;
  positionValue: number;
  realizedPnl: number; // 누적 실현 손익 (추가)
}
```

## Implementation Phases

### Phase 1: 현금 잔액 자동 업데이트 (완료)

1. 현금 계산 함수 작성 (`lib/trades/calculations.ts`)
2. 액션 생성 API에 현금 업데이트 로직 추가
3. 액션 수정/삭제 API에 현금 재계산 로직 추가
4. 테스트 작성 및 검증

### Phase 2: 현재가(전일대비) 표시 (완료)

1. `getTradesList` 쿼리에 전일 종가 조회 로직 추가
2. `TradeListItem` 타입에 `priceChangePercent` 필드 추가
3. `OpenTradesTable` 컴포넌트의 현재가 컬럼 수정
4. 테스트 작성 및 검증

### Phase 3: 자동 완료 처리 (완료)

1. 액션 생성 API에 자동 완료 로직 추가
2. `currentQuantity === 0` 체크 및 상태 업데이트
3. 테스트 작성 및 검증

### Phase 4: URL 기반 탭 관리 (완료)

1. `TradesClient`에서 URL 쿼리 파라미터 읽기
2. `handleStatusChange`에서 `router.push` 사용
3. 서버 컴포넌트에서 `searchParams` 파싱
4. 테스트 작성 및 검증

### Phase 5: 실현손익 컬럼 추가 (완료)

1. `OpenTradesTable`에 실현손익 컬럼 추가
2. `calculated.realizedPnl` 표시
3. 색상 스타일링 (양수: 초록, 음수: 빨강)
4. 테스트 작성 및 검증

### Phase 6: 수익 흐름(PnL) 차트 (완료)

1. `AssetFlowChart` → `PnlFlowChart` 리네이밍 또는 수정
2. `/api/trades/assets`에 `realizedPnl` 필드 추가
3. 차트 데이터를 `realizedPnl`로 변경
4. 제목 및 스타일 수정
5. 테스트 작성 및 검증

## Risk Assessment

### High Risk

- **현금 잔액 계산 오류**: 액션 수정/삭제 시 재계산 로직이 복잡할 수 있음
  - **완화**: 트랜잭션 사용 및 단위 테스트로 검증

### Medium Risk

- **전일 종가 조회 성능**: JOIN 쿼리가 복잡할 수 있음
  - **완화**: 인덱스 활용 및 쿼리 최적화

- **자동 완료 처리 타이밍**: 사용자가 의도하지 않은 완료 처리 가능
  - **완화**: 사용자에게 알림 표시 (선택사항)

### Low Risk

- **URL 기반 탭 관리**: 기존 로직과 충돌 가능성 낮음
- **컴포넌트 리네이밍**: 기존 참조 업데이트 필요

## Success Metrics

- ✅ 매수/매도 시 현금 잔액이 자동으로 업데이트됨
- ✅ 진행중 매매 테이블에 전일대비 변동률이 표시됨
- ✅ 진행중 매매에서 모든 보유 수량 매도 시 자동 완료됨
- ✅ 브라우저 뒤로가기 시 탭 상태가 유지됨
- ✅ 진행중 매매 테이블에 실현손익 컬럼이 표시됨
- ✅ 통계 페이지의 차트가 수익 흐름(PnL)으로 변경됨

## Future Enhancements

- 현금 잔액 변경 이력 추적
- 전일대비 변동률 알림 기능
- 자동 완료 시 사용자 알림 (토스트 메시지)

## Dependencies

- 기존 매매일지 기능
- `daily_prices` 테이블
- `portfolio_settings` 테이블

## Timeline

- Phase 1: 현금 잔액 자동 업데이트 (1일)
- Phase 2: 현재가(전일대비) 표시 (1일)
- Phase 3: 자동 완료 처리 (0.5일)
- Phase 4: URL 기반 탭 관리 (0.5일)
- Phase 5: 실현손익 컬럼 추가 (0.5일)
- Phase 6: 수익 흐름(PnL) 차트 (1일)

**총 예상 시간**: 4.5일

## Notes

- 모든 변경사항은 기존 기능과 호환되어야 함
- 현금 잔액 수동 수정 기능은 유지
- 자동 완료 기능은 사용자가 수동 완료할 수도 있음

