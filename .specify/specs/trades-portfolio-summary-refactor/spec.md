# Spec: 포지션 현황 UI 개선

**Feature Branch**: `feature/portfolio-summary-refactor`  
**Status**: ✅ Completed  
**Created**: 2025-01-XX

---

## 개요

매매일지의 포지션 현황(PortfolioSummary) 컴포넌트를 개선하여 현금 관리 기능을 제거하고, 포지션 정보 표시를 더 명확하게 개선합니다.

---

## 목표

1. 현금 관리 기능 제거로 복잡도 감소
2. 포지션 정보 표시 형식 개선 (원금 + 손익 + 수익률)
3. 숫자 표시 형식 개선 (전체 숫자 표시)
4. 파이 차트 색상 문제 해결

---

## 요구사항

### 1. 현금 관리 기능 제거

- [x] `CashBalanceEditor` 컴포넌트 사용 중단
- [x] `initialCashBalance` prop 제거
- [x] `cashBalance` state 제거
- [x] `handleCashSave` 함수 제거
- [x] `getCashBalance()` API 호출 제거
- [x] 현금 관련 UI 요소 제거

### 2. 포지션 정보 표시 형식

**표시 항목**:
1. **포지션 총합** (큰 글씨, 2xl)
   - 현재 포지션 가치 = Σ(현재가 × 수량)
   - 전체 숫자 표시 (예: `$100,000.00`)

2. **원금 + 손익 (퍼센트)** (작은 글씨, sm)
   - 원금: 평균 진입가 × 현재 수량 (cost basis)
   - 손익: 미실현 손익 (unrealized PnL)
   - 수익률: 손익 / 원금 × 100%
   - 형식: `$80,000.00 +$20,000.00 (+25.0%)`

3. **종목 개수** (작은 글씨, xs)
   - 예: `4개 종목`

**색상**:
- 손익이 양수: 초록색 (`text-green-600`)
- 손익이 음수: 빨간색 (`text-red-600`)
- 손익이 0: 표시하지 않음

### 3. 숫자 표시 형식

- 넓은 공간에서는 전체 숫자 표시 (K 단위 축약 제거)
- `formatPositionValueFull()`: `$3,900.00` 형식
- `formatPnlFull()`: `+$2,000.00` 형식
- `formatRoi()`: `+25.0%` 형식

### 4. 파이 차트

- 종목만 표시 (현금 제거)
- 각 종목에 고유 색상 할당
- `STOCK_COLORS` 배열을 순환하여 색상 할당

---

## 구현 세부사항

### 계산 로직

```typescript
// 원금 계산 (평균 진입가 × 현재 수량)
const totalCostBasis = openTrades.reduce((sum, trade) => {
  const { avgEntryPrice, currentQuantity } = trade.calculated;
  if (avgEntryPrice > 0 && currentQuantity > 0) {
    return sum + avgEntryPrice * currentQuantity;
  }
  return sum;
}, 0);

// 미실현 손익 계산
const totalUnrealizedPnl = openTrades.reduce((sum, trade) => {
  const currentPrice = trade.currentPrice || 0;
  const { avgEntryPrice, currentQuantity } = trade.calculated;
  if (currentPrice > 0 && avgEntryPrice > 0 && currentQuantity > 0) {
    const { unrealizedPnl } = calculateUnrealizedPnl(
      avgEntryPrice,
      currentQuantity,
      currentPrice
    );
    return sum + unrealizedPnl;
  }
  return sum;
}, 0);

// 수익률 계산
const totalRoi = totalCostBasis > 0 ? totalUnrealizedPnl / totalCostBasis : 0;
```

### UI 구조

```tsx
<div className="mb-3">
  <div className="flex flex-col gap-1">
    {/* 포지션 총합 */}
    <span className="text-2xl font-bold">
      {formatPositionValueFull(totalPositionValue)}
    </span>
    
    {/* 원금 + 손익 (퍼센트) */}
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-gray-600">
        {formatPositionValueFull(totalCostBasis)}
      </span>
      {totalUnrealizedPnl !== 0 && (
        <>
          <span className={`font-medium ${colorClass}`}>
            {formatPnlFull(totalUnrealizedPnl)}
          </span>
          <span className={`text-xs ${colorClass}`}>
            ({formatRoi(totalRoi)})
          </span>
        </>
      )}
    </div>
  </div>
  
  {/* 종목 개수 */}
  {openTrades.length > 0 && (
    <span className="text-gray-400 text-xs mt-1">
      {openTrades.length}개 종목
    </span>
  )}
</div>
```

---

## 변경된 파일

1. **`apps/web/src/components/trades/PortfolioSummary.tsx`**
   - 현금 관련 로직 제거
   - 포지션 정보 표시 형식 변경
   - 원금, 손익, 수익률 계산 추가

2. **`apps/web/src/app/trades/page.tsx`**
   - `getCashBalance` import 및 호출 제거
   - `initialCashBalance` prop 전달 제거

3. **`apps/web/src/app/trades/TradesClient.tsx`**
   - `initialCashBalance` prop 제거
   - `PortfolioSummary`에 `initialCashBalance` 전달 제거

---

## 테스트 체크리스트

- [x] 포지션 총합이 올바르게 표시되는가?
- [x] 원금이 올바르게 계산되어 표시되는가?
- [x] 손익이 올바르게 계산되어 표시되는가?
- [x] 수익률이 올바르게 계산되어 표시되는가?
- [x] 손익이 0일 때 손익 표시가 숨겨지는가?
- [x] 숫자가 전체 형식으로 표시되는가?
- [x] 파이 차트에 종목별 고유 색상이 할당되는가?
- [x] 현금 관련 UI가 모두 제거되었는가?

---

## 참고사항

- 현금 관리 기능은 필요 시 별도 섹션으로 재도입 가능
- `CashBalanceEditor` 컴포넌트는 파일은 유지하되 사용 중단
- `getCashBalance()` 함수는 다른 곳에서 사용되지 않으므로 제거 가능

