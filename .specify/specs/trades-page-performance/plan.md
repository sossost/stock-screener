# 매매일지 페이지 성능 개선 계획

**Feature Branch**: `feature/trades-page-performance`  
**Created**: 2025-12-05  
**Status**: ✅ Completed

## 기술적 컨텍스트

### 현재 구조

- **페이지**: `apps/web/src/app/trades/page.tsx`
  - 서버 컴포넌트로 데이터 fetch
  - Suspense 없음 → 블로킹 발생

- **쿼리**: `apps/web/src/lib/trades/queries.ts`
  - `getTradesList` 함수에서 최신 가격과 전일 가격을 2번의 쿼리로 조회
  - 전일 가격 쿼리가 중첩 서브쿼리로 비효율적

### 기존 패턴

- 다른 페이지들(`stats/page.tsx`, `page.tsx`)은 Suspense 사용
- `loading.tsx` 파일 패턴 존재

### 핵심 제약사항

- **Next.js 15 App Router**: 서버 컴포넌트에서 Suspense 사용
- **데이터 일관성**: 쿼리 최적화 시 결과가 동일해야 함
- **타입 안전성**: 기존 타입 정의 유지

---

## 구현 단계

### Phase 1: Suspense 추가

**목표**: 로딩 상태 표시로 사용자 경험 개선

#### 1.1 로딩 스켈레톤 컴포넌트 생성

**파일**: `apps/web/src/app/trades/page.tsx`

```typescript
function TradesSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-3">
        <Skeleton className="h-10 w-32 mb-4" />
        <Skeleton className="h-10 w-full mb-6" />
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
```

#### 1.2 Suspense 적용

**파일**: `apps/web/src/app/trades/page.tsx`

```typescript
export default async function TradesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = (params.status === "CLOSED" ? "CLOSED" : "OPEN") as TradeStatus;

  return (
    <Suspense fallback={<TradesSkeleton />}>
      <TradesContent status={status} />
    </Suspense>
  );
}
```

### Phase 2: 쿼리 최적화

**목표**: 윈도우 함수로 쿼리 성능 개선

#### 2.1 가격 조회 로직 최적화

**파일**: `apps/web/src/lib/trades/queries.ts`

**현재 로직**:
1. 최신 가격 조회 (1번 쿼리)
2. 전일 가격 조회 (1번 쿼리, 중첩 서브쿼리)

**최적화된 로직**:
1. 윈도우 함수로 최신 가격과 전일 가격을 한 번에 조회 (1번 쿼리)

#### 2.2 쿼리 구현

```typescript
// 배치 조회: 심볼별 최신 가격 및 전일 가격 (윈도우 함수로 최적화)
const uniqueSymbols = [...new Set(tradeList.map((t) => t.trade.symbol))];

if (uniqueSymbols.length === 0) {
  return [];
}

// 최신 가격 및 전일 가격을 한 번의 쿼리로 조회 (윈도우 함수 사용)
const priceData = await db.execute(sql`
  WITH ranked_prices AS (
    SELECT
      symbol,
      close,
      date,
      ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) AS rn
    FROM daily_prices
    WHERE symbol IN (${sql.join(
      uniqueSymbols.map((s) => sql`${s}`),
      sql`, `
    )})
  )
  SELECT
    symbol,
    MAX(CASE WHEN rn = 1 THEN close END) AS latest_close,
    MAX(CASE WHEN rn = 1 THEN date END) AS latest_date,
    MAX(CASE WHEN rn = 2 THEN close END) AS prev_close
  FROM ranked_prices
  WHERE rn <= 2
  GROUP BY symbol
`);

// 결과 파싱
const priceBySymbol = new Map<string, number>();
const prevPriceBySymbol = new Map<string, number>();
const priceChangeBySymbol = new Map<string, number>();

for (const row of priceData.rows) {
  const symbol = row.symbol;
  if (row.latest_close) {
    priceBySymbol.set(symbol, parseFloat(row.latest_close));
  }
  if (row.prev_close) {
    prevPriceBySymbol.set(symbol, parseFloat(row.prev_close));
  }
}

// 전일대비 변동률 계산
for (const symbol of uniqueSymbols) {
  const currentPrice = priceBySymbol.get(symbol);
  const prevPrice = prevPriceBySymbol.get(symbol);
  if (currentPrice && prevPrice && prevPrice > 0) {
    const changePercent = ((currentPrice - prevPrice) / prevPrice) * 100;
    priceChangeBySymbol.set(symbol, changePercent);
  }
}
```

---

## 성능 기대 효과

### 쿼리 성능

- **쿼리 수**: 2번 → 1번으로 감소
- **쿼리 복잡도**: 중첩 서브쿼리 제거로 실행 계획 최적화
- **예상 성능 향상**: 30-50% 쿼리 실행 시간 단축

### 사용자 경험

- **로딩 상태 표시**: 즉시 피드백 제공
- **인지된 성능**: Suspense로 페이지 즉시 렌더링

---

## 리스크 및 대응

### 리스크 1: 쿼리 결과 불일치

**가능성**: 낮음  
**영향**: 높음  
**대응**: 테스트 코드로 결과 일치 확인

### 리스크 2: 윈도우 함수 성능

**가능성**: 낮음  
**영향**: 중간  
**대응**: 인덱스 확인 및 쿼리 실행 계획 분석

---

## 검증 방법

### 성능 측정

1. 쿼리 실행 시간 측정 (Before/After)
2. 페이지 로딩 시간 측정
3. 사용자 경험 개선 확인

### 기능 검증

1. Suspense가 올바르게 작동하는지 확인
2. 최적화된 쿼리가 올바른 데이터를 반환하는지 확인
3. 기존 기능이 정상 작동하는지 확인

