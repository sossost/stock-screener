# 이평선 필터 버그 수정 및 성능 최적화 계획

## 작업 단계

### Phase 1: 버그 수정 (완료)

1. ✅ 이평선 필터 기본값 제거

   - `filterDefaults` 수정
   - `useFilterState` 수정
   - `parseFilters` 수정
   - `buildQueryParams` 수정

2. ✅ 필터 모달 초기값 수정

   - `CategoryFilterDialog` 수정

3. ✅ SQL 쿼리 수정

   - `buildCurrentDataCTE` 수정
   - `buildCandidatesCTE` 수정
   - `buildScreenerQuery` 수정

4. ✅ API 응답 수정
   - `transformResults` 수정
   - 타입 정의 수정

### Phase 2: 성능 최적화 (완료)

1. ✅ 필터 모달 최적화

   - `initialTempState` 계산 최적화 (`open`이 `true`일 때만)
   - `useEffect` 의존성 배열 최적화

2. ✅ 테이블 렌더링 최적화
   - **무한 스크롤 구현**: 초기 100개만 렌더링, 스크롤 시 50개씩 추가
   - `StockTableRow` 메모이제이션
   - 포트폴리오 상태 Map 최적화 (5000번 호출 → 1번 계산)
   - 차트 데이터 메모이제이션
   - `QuarterlyBarChart` 메모이제이션
   - 섹터 포맷팅 메모이제이션
   - 콜백 메모이제이션 (`handleSort`, `handleTogglePortfolio`)

### Phase 3: 테스트 및 검증

1. 버그 수정 검증
2. 성능 검증
3. 통합 테스트

## 기술적 세부사항

### 버그 수정 상세

#### 1. 필터 기본값 제거

```typescript
// Before
ordered: true,
goldenCross: true,

// After
ordered: false, // URL 파라미터에 명시적으로 값이 있어야만 적용
goldenCross: false, // URL 파라미터에 명시적으로 값이 있어야만 적용
```

#### 2. SQL 쿼리 수정

```sql
-- requireMA = false일 때
SELECT ... FROM daily_prices dp
LEFT JOIN daily_ma dm ON dm.symbol = dp.symbol AND dm.date = dp.date
WHERE ... AND (dp.symbol, dp.date::date) IN (
  SELECT symbol, MAX(date::date) FROM daily_prices GROUP BY symbol
)
```

#### 3. ordered 정보 계산

```sql
CASE
  WHEN cand.ma20 IS NOT NULL AND cand.ma50 IS NOT NULL
    AND cand.ma100 IS NOT NULL AND cand.ma200 IS NOT NULL
    THEN (cand.ma20 > cand.ma50 AND cand.ma50 > cand.ma100
          AND cand.ma100 > cand.ma200)
  ELSE NULL
END AS ordered
```

### 성능 최적화 상세

#### 1. 필터 모달 최적화

```typescript
// Before
const initialTempState = React.useMemo(() => {
  // 항상 계산
}, [category, filterState]);

// After
const initialTempState = React.useMemo(() => {
  if (!open) return {}; // open이 false일 때는 빈 객체 반환
  // open이 true일 때만 계산
}, [open, category, filterState]);
```

#### 2. 무한 스크롤 구현

```typescript
const [visibleCount, setVisibleCount] = React.useState(INFINITE_SCROLL.INITIAL_LOAD_COUNT);
const sortedDataLengthRef = React.useRef(sortedData.length);

// sortedData.length를 ref로 추적
React.useEffect(() => {
  sortedDataLengthRef.current = sortedData.length;
}, [sortedData.length]);

React.useEffect(() => {
  const loadMoreEl = loadMoreRef.current;
  if (!loadMoreEl) return;

  observerRef.current = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      setVisibleCount((prev) => {
        const maxLength = sortedDataLengthRef.current;
        return prev < maxLength
          ? Math.min(prev + INFINITE_SCROLL.LOAD_MORE_COUNT, maxLength)
          : prev;
      });
    }
  });
  observerRef.current.observe(loadMoreEl);
  // ...
}, [sortedData.length]); // 데이터 길이 변경 시 observer 재연결
```

#### 3. 테이블 행 및 차트 메모이제이션

```typescript
const StockTableRow = React.memo(function StockTableRow({ ... }) {
  const revenueChartData = React.useMemo(
    () => getChartData(c.quarterly_financials, "revenue"),
    [c.quarterly_financials]
  );
  // ...
});

const QuarterlyBarChart = React.memo(function QuarterlyBarChart({ ... }) {
  // ...
});
```

#### 4. 포트폴리오 상태 최적화

```typescript
const portfolioMap = React.useMemo(() => {
  const map = new Map<string, boolean>();
  sortedData.forEach((c) => {
    map.set(c.symbol, isInPortfolio(c.symbol));
  });
  return map;
}, [sortedData, isInPortfolio]);
```

## 예상 영향

### 긍정적 영향

- 이평선 필터가 명시적으로 요청될 때만 적용되어 예상치 못한 필터링 방지
- 필터를 모두 끈 상태에서 모든 티커 표시 가능
- 필터 모달 및 테이블 렌더링 성능 개선

### 주의사항

- 기존에 URL 파라미터 없이 이평선 필터를 사용하던 사용자는 URL에 명시적으로 추가해야 함
- 필터 퍼시스턴트 기능과의 호환성 확인 필요

## 롤백 계획

문제 발생 시:

1. 브랜치를 원래 상태로 되돌림
2. 필터 기본값을 다시 `true`로 설정
3. SQL 쿼리를 원래 로직으로 복원
