# Tasks: 포지션 현황 UI 개선

**Feature Branch**: `feature/portfolio-summary-refactor`  
**Status**: ✅ Completed  
**Created**: 2025-01-XX

---

## Phase 1: 현금 관리 기능 제거

### Task 1.1: PortfolioSummary 컴포넌트에서 현금 관련 코드 제거

- [x] `CashBalanceEditor` import 제거
- [x] `CASH_COLOR` import 제거
- [x] `initialCashBalance` prop 제거
- [x] `cashBalance` state 제거
- [x] `handleCashSave` 함수 제거
- [x] `cashWeight` 계산 제거
- [x] 현금 UI 요소 제거
- [x] segments에서 현금 제거

**파일**: `apps/web/src/components/trades/PortfolioSummary.tsx`

---

### Task 1.2: 상위 컴포넌트에서 현금 관련 코드 제거

- [x] `page.tsx`에서 `getCashBalance` import 제거
- [x] `page.tsx`에서 `getCashBalance()` 호출 제거
- [x] `page.tsx`에서 `initialCashBalance` prop 전달 제거
- [x] `TradesClient.tsx`에서 `initialCashBalance` prop 제거
- [x] `TradesClient.tsx`에서 `PortfolioSummary`에 `initialCashBalance` 전달 제거

**파일**: 
- `apps/web/src/app/trades/page.tsx`
- `apps/web/src/app/trades/TradesClient.tsx`

---

## Phase 2: 포지션 정보 표시 형식 개선

### Task 2.1: 계산 로직 추가

- [x] `totalCostBasis` 계산 로직 추가 (원금)
- [x] `totalUnrealizedPnl` 계산 로직 추가 (미실현 손익)
- [x] `totalRoi` 계산 로직 추가 (수익률)

**파일**: `apps/web/src/components/trades/PortfolioSummary.tsx`

**계산 로직**:
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

---

### Task 2.2: UI 구조 변경

- [x] 섹션 제목 변경: "자산 현황" → "포지션 현황"
- [x] 포지션 총합 표시 (큰 글씨, 2xl)
- [x] 원금 + 손익 (퍼센트) 표시 (작은 글씨, sm)
- [x] 종목 개수 표시 (작은 글씨, xs)
- [x] 손익이 0일 때 손익 표시 숨김 처리

**파일**: `apps/web/src/components/trades/PortfolioSummary.tsx`

**UI 구조**:
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

## Phase 3: 숫자 표시 형식 개선

### Task 3.1: 포맷 함수 변경

- [x] 포지션 총합: `formatPositionValue` → `formatPositionValueFull`
- [x] 원금: `formatPositionValue` → `formatPositionValueFull`
- [x] 손익: `formatPnl` → `formatPnlFull`

**파일**: `apps/web/src/components/trades/PortfolioSummary.tsx`

**변경 내용**:
- K 단위 축약 제거
- 전체 숫자 표시 (예: `$100,000.00`)

---

## Phase 4: 파이 차트 색상 문제 해결

### Task 4.1: segments 계산 로직 수정

- [x] 현금 제거 (이미 Phase 1에서 완료)
- [x] 종목만 필터링하여 색상 할당
- [x] 범례에서 현금 제거

**파일**: `apps/web/src/components/trades/PortfolioSummary.tsx`

**변경 내용**:
```typescript
// 도넛 차트 세그먼트 계산 (종목만)
const segments = positions
  .filter((p) => p.weight > 0)
  .map((p, i) => ({
    label: p.symbol,
    weight: p.weight,
    color: STOCK_COLORS[i % STOCK_COLORS.length],
  }));
```

---

## 테스트

### Task 5.1: 수동 테스트

- [x] 진행중인 매매가 있을 때 포지션 현황이 표시되는지 확인
- [x] 포지션 총합이 올바르게 계산되어 표시되는지 확인
- [x] 원금이 올바르게 계산되어 표시되는지 확인
- [x] 손익이 올바르게 계산되어 표시되는지 확인
- [x] 수익률이 올바르게 계산되어 표시되는지 확인
- [x] 손익이 0일 때 손익 표시가 숨겨지는지 확인
- [x] 숫자가 전체 형식으로 표시되는지 확인
- [x] 파이 차트에 종목별 고유 색상이 할당되는지 확인
- [x] 현금 관련 UI가 모두 제거되었는지 확인

---

## 문서화

### Task 6.1: 문서 작성

- [x] `spec.md` 작성
- [x] `CHANGELOG.md` 작성
- [x] `SUMMARY.md` 작성
- [x] `plan.md` 작성
- [x] `tasks.md` 작성

---

## 완료 체크리스트

- [x] 모든 Phase 완료
- [x] 수동 테스트 완료
- [x] 컴파일 에러 없음
- [x] 린트 에러 없음
- [x] 문서화 완료

---

## 참고사항

- 현금 관리 기능은 필요 시 별도 섹션으로 재도입 가능
- `CashBalanceEditor` 컴포넌트는 파일은 유지하되 사용 중단
- `getCashBalance()` 함수는 다른 곳에서 사용되지 않으므로 제거 가능

