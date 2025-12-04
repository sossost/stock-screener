# 돌파매매 필터 구현 계획

## 기술적 컨텍스트

### 데이터 구조
- `daily_prices`: `open`, `high`, `low`, `close`, `volume`, `date`
- `daily_ma`: `ma20`, `ma50`, `ma200`, `vol_ma30`, `date`
- 스키마 변경 없음

### 기존 필터 패턴
- 필터는 `ScreenerParams` 타입에 추가
- `buildWhereFilters` 함수에 조건 추가
- 필터 스키마(`filterSchema`)에 필드 추가
- UI는 `CategoryFilterDialog`에 추가

### 핵심 제약사항
- **EOD 데이터 기준**: 어제 데이터 기준 계산 (최신 거래일 - 1일)
- **윈도우 함수 사용**: 20일 고점, 20일 평균 거래량 계산 시 윈도우 함수 필요
- **성능 고려**: 윈도우 함수는 비용이 높으므로 최적화 필요

---

## 구현 단계

### Phase 1: 데이터 레이어 (Backend)

#### 1.1 타입 정의

**파일**: `apps/web/src/types/screener.ts`

```typescript
export interface ScreenerParams {
  // ... 기존 필드들
  breakoutStrategy?: "confirmed" | "retest" | null; // 전략 A 또는 B 선택
}
```

**작업**:
- [ ] `ScreenerParams`에 `breakoutStrategy` 필드 추가
- [ ] 타입: `"confirmed" | "retest" | null` (null = 필터 비활성화)

#### 1.2 쿼리 빌더 수정

**파일**: `apps/web/src/lib/screener/query-builder.ts`

**전략 A (Confirmed Breakout) 구현**:
```sql
WITH yesterday_data AS (
  SELECT
    dp.symbol,
    dp.date,
    dp.close,
    dp.high,
    dp.low,
    dp.volume,
    -- 20일 고점 계산
    MAX(dp.high) OVER (
      PARTITION BY dp.symbol 
      ORDER BY dp.date 
      ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
    ) AS high_20d,
    -- 20일 평균 거래량
    AVG(dp.volume) OVER (
      PARTITION BY dp.symbol 
      ORDER BY dp.date 
      ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
    ) AS avg_volume_20d
  FROM daily_prices dp
  WHERE dp.date = (SELECT MAX(date) FROM daily_prices) - INTERVAL '1 day'
)
SELECT symbol
FROM yesterday_data
WHERE 
  -- 1. 신고가 돌파
  close >= high_20d
  -- 2. 거래량 폭증
  AND volume >= (avg_volume_20d * 2.0)
  -- 3. 강한 양봉 (윗꼬리 20% 이내)
  AND (high - close) < ((high - low) * 0.2)
```

**전략 B (Perfect Retest) 구현**:
```sql
WITH yesterday_data AS (
  SELECT
    dp.symbol,
    dp.date,
    dp.close,
    dp.open,
    dp.low,
    dp.high,
    dm.ma20,
    dm.ma50,
    dm.ma200
  FROM daily_prices dp
  JOIN daily_ma dm ON dp.symbol = dm.symbol AND dp.date = dm.date
  WHERE dp.date = (SELECT MAX(date) FROM daily_prices) - INTERVAL '1 day'
),
past_breakouts AS (
  -- 3~10일 전 신고가 돌파 이력 확인
  SELECT DISTINCT dp.symbol
  FROM daily_prices dp
  WHERE dp.date BETWEEN 
    (SELECT MAX(date) FROM daily_prices) - INTERVAL '10 days' AND
    (SELECT MAX(date) FROM daily_prices) - INTERVAL '3 days'
  AND dp.close >= (
    SELECT MAX(high) OVER (
      PARTITION BY dp2.symbol 
      ORDER BY dp2.date 
      ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
    )
    FROM daily_prices dp2
    WHERE dp2.symbol = dp.symbol AND dp2.date <= dp.date
    LIMIT 1
  )
)
SELECT yd.symbol
FROM yesterday_data yd
JOIN past_breakouts pb ON pb.symbol = yd.symbol
WHERE 
  -- 1. 정배열
  yd.ma20 > yd.ma50 AND yd.ma50 > yd.ma200
  -- 2. 20일선 부근 (98%~105%)
  AND yd.close >= (yd.ma20 * 0.98)
  AND yd.close <= (yd.ma20 * 1.05)
  -- 3. 양봉 또는 망치형
  AND (
    yd.close >= yd.open OR
    (yd.open - yd.low) > (yd.close - yd.open)
  )
```

**작업**:
- [ ] `buildWhereFilters` 함수에 돌파매매 필터 조건 추가
- [ ] 전략 A: `breakoutStrategy === "confirmed"`일 때 조건 추가
- [ ] 전략 B: `breakoutStrategy === "retest"`일 때 조건 추가
- [ ] **어제 데이터 기준**: `(SELECT MAX(date) FROM daily_prices) - INTERVAL '1 day'` 사용
- [ ] 윈도우 함수 최적화 (인덱스 활용)

#### 1.3 API 라우트 수정

**파일**: `apps/web/src/app/api/screener/stocks/route.ts`

**작업**:
- [ ] `parseRequestParams` 함수에서 `breakoutStrategy` 파라미터 파싱 추가
- [ ] 기본값: `null` (필터 비활성화)
- [ ] 유효성 검사: `"confirmed" | "retest" | null`만 허용

---

### Phase 2: 상태 관리 (Frontend)

#### 2.1 필터 스키마 확장

**파일**: `apps/web/src/lib/filters/schema.ts`

**작업**:
- [ ] `filterSchema`에 `breakoutStrategy` 필드 추가
  ```typescript
  breakoutStrategy: z.enum(["confirmed", "retest"]).optional().nullable()
  ```
- [ ] `filterDefaults`에 기본값 추가: `null`
- [ ] `buildQueryParams`에 새 필터 포함
- [ ] `buildCacheTag`에 새 필터 포함

#### 2.2 useFilterState 훅 확장

**파일**: `apps/web/src/hooks/useFilterState.ts`

**작업**:
- [ ] `breakoutStrategy`, `setBreakoutStrategy` 추가
- [ ] `useQueryState`로 URL 파라미터와 동기화
- [ ] 기본값: `null` (필터 비활성화)

#### 2.3 useFilterActions 훅 수정

**파일**: `apps/web/src/hooks/useFilterActions.ts`

**작업**:
- [ ] `handleFilterApply`에서 새 필터 상태 반영
- [ ] `handleFilterReset`에서 새 필터 초기화 (`null`로 초기화)
- [ ] `handleFilterChange`에 새 필터 파라미터 추가

---

### Phase 3: UI 구현

#### 3.1 필터 다이얼로그 UI

**파일**: `apps/web/src/components/filters/CategoryFilterDialog.tsx`

**작업**:
- [ ] "돌파매매" 또는 "가격" 카테고리에 라디오 버튼 그룹 추가
- [ ] 옵션:
  - ○ 없음 (기본값)
  - ○ 어제 뚫어낸 놈 (Confirmed)
  - ○ 어제 지지받은 놈 (Retest)
- [ ] 라디오 버튼 상태 관리 로직 추가

#### 3.2 필터 요약

**파일**: `apps/web/src/lib/filters/summary.ts`

**작업**:
- [ ] `getMAFilterSummary` 또는 새로운 함수에 돌파매매 필터 요약 로직 추가
- [ ] 전략 A 활성화 시: "어제 신고가 뚫은 종목"
- [ ] 전략 B 활성화 시: "어제 지지받고 고개 든 종목"

---

### Phase 4: 테스트 및 검증

#### 4.1 기능 테스트

**작업**:
- [ ] 전략 A 필터 테스트 (신고가 돌파 + 거래량 폭증 + 강한 양봉)
- [ ] 전략 B 필터 테스트 (정배열 + 과거 돌파 이력 + 20일선 부근 + 양봉/망치형)
- [ ] 필터 해제 테스트 (`null`로 초기화)
- [ ] URL 쿼리 파라미터 테스트

#### 4.2 엣지 케이스

**작업**:
- [ ] 어제 데이터가 없는 경우 처리 (주말/휴일)
- [ ] 20일 데이터가 부족한 종목 처리 (NULL 처리)
- [ ] 과거 돌파 이력이 없는 종목 처리 (전략 B)
- [ ] 필터 상태 유지 확인 (새로고침)

#### 4.3 성능 테스트

**작업**:
- [ ] 윈도우 함수 성능 측정
- [ ] 쿼리 실행 시간 벤치마크
- [ ] 인덱스 활용 확인

---

## 기술적 고려사항

### 1. 어제 데이터 기준 계산

**문제**: 최신 거래일이 주말/휴일일 수 있음

**해결**:
```sql
-- 최신 거래일 조회
WITH last_trade_date AS (
  SELECT MAX(date)::date AS d FROM daily_prices
),
yesterday_trade_date AS (
  SELECT MAX(date)::date AS d 
  FROM daily_prices 
  WHERE date < (SELECT d FROM last_trade_date)
)
-- yesterday_trade_date를 사용하여 어제 데이터 조회
```

### 2. 윈도우 함수 성능

**최적화 전략**:
- 인덱스 활용: `(symbol, date)` 복합 인덱스 확인
- 서브쿼리 최소화: CTE로 재사용
- 필요한 컬럼만 SELECT

### 3. 과거 돌파 이력 확인 (전략 B)

**구현 방법 (최신)**:
- EOD ETL(`build-breakout-signals`)에서:
  - 서브쿼리로 3~10일 전 데이터 조회
  - 윈도우 함수로 각 날짜의 20일 고점 계산
  - 신고가 돌파 이력을 계산하여 `daily_breakout_signals.isPerfectRetest`에 반영
- 스크리너 쿼리에서는 추가 CTE 없이 `daily_breakout_signals`를 `JOIN`하고, `WHERE is_perfect_retest IS TRUE`로 필터링만 수행

---

## 구현 순서

1. **Phase 1.1**: 타입 정의 (`ScreenerParams`)
2. **Phase 1.2**: 쿼리 빌더 수정 (전략 A 먼저, 전략 B 나중)
3. **Phase 1.3**: API 라우트 수정
4. **Phase 2**: 상태 관리 (스키마 → 훅 → 액션)
5. **Phase 3**: UI 구현 (다이얼로그 → 요약)
6. **Phase 4**: 테스트 및 검증

---

## 리스크 및 대응

### 리스크 1: 윈도우 함수 성능 저하

**확률**: 낮음 (실시간 쿼리에서 제거됨)  
**영향**: 중간 (ETL 배치에서만 발생)  
**대응**:
- 윈도우/EXISTS는 ETL 잡(`build-breakout-signals`) 내부에만 존재
- `daily_breakout_signals`에 `(symbol, date)` 및 `date + flag` 인덱스로 조회 최적화
- ETL 실행 시간 모니터링 후 필요 시 쿼리/인덱스 추가 튜닝

### 리스크 2: 어제 데이터 부재 (주말/휴일)

**확률**: 높음  
**영향**: 중간  
**대응**:
- `getPreviousTradeDate` 유틸리티 함수 활용
- NULL 처리 로직 추가

### 리스크 3: 과거 돌파 이력 확인 복잡도

**확률**: 중간  
**영향**: 중간  
**대응**:
- CTE로 단계별 분리
- 성능 테스트 후 최적화

---

## 성공 메트릭

1. **기능**: 두 전략 모두 정상 작동
2. **성능**: 쿼리 실행 시간 < 500ms (기존 스크리너와 유사)
3. **UX**: 필터 선택이 직관적이고 명확함

---

## 참고 자료

- 스펙 문서: `.specify/specs/breakout-trading-filters/spec.md`
- 기존 필터 구현: `.specify/specs/ma-above-filter/`
- 쿼리 빌더: `apps/web/src/lib/screener/query-builder.ts`
- 날짜 유틸리티: `apps/web/src/etl/utils/date-helpers.ts`

