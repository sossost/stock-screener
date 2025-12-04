# 노이즈 필터 구현 계획

## 기술적 컨텍스트

### 데이터 구조
- `daily_prices`: `open`, `high`, `low`, `close`, `volume`, `date`
- `daily_ma`: `ma20`, `ma50`, `ma200`, `date`
- **신규**: `daily_noise_signals`: 노이즈 필터 신호 저장

### 기존 필터 패턴
- 필터는 `ScreenerParams` 타입에 추가
- `buildWhereFilters` 함수에 조건 추가
- 필터 스키마(`filterSchema`)에 필드 추가
- UI는 `CategoryFilterDialog`에 추가

### 핵심 제약사항
- **EOD 데이터 기준**: 최신 거래일 기준 계산
- **윈도우 함수 사용**: 거래량 필터에서 20일 평균 계산 시 윈도우 함수 필요
- **성능 고려**: VCP 필터는 복잡하므로 ETL로 사전 계산 (ADR-NF-001)
- **혼합 계산 방식**: VCP는 ETL, 나머지는 실시간 계산 (ADR-NF-002)

---

## 구현 단계

### Phase 1: 데이터 레이어 (Backend) - ETL 및 스키마

#### 1.1 데이터베이스 스키마

**파일**: `apps/web/src/db/schema.ts`

```typescript
export const dailyNoiseSignals = pgTable(
  "daily_noise_signals",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => symbols.symbol, { onDelete: "cascade" }),
    date: text("date").notNull(), // 'YYYY-MM-DD'
    // 거래량 필터 (20일 평균)
    avgDollarVolume20d: numeric("avg_dollar_volume_20d"),
    avgVolume20d: numeric("avg_volume_20d"),
    // VCP 필터
    atr14: numeric("atr14"),
    atr14Percent: numeric("atr14_percent"), // ATR(14) / close * 100
    bbWidthCurrent: numeric("bb_width_current"),
    bbWidthAvg60d: numeric("bb_width_avg_60d"),
    isVcp: boolean("is_vcp").notNull().default(false),
    // 캔들 몸통 필터 (최신 거래일만)
    bodyRatio: numeric("body_ratio"), // (close - open) / (high - low)
    // 이평선 밀집 필터 (최신 거래일만)
    ma20Ma50DistancePercent: numeric("ma20_ma50_distance_percent"), // (MA20 - MA50) / MA50 * 100
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uq: unique("uq_daily_noise_signals_symbol_date").on(t.symbol, t.date),
    idx_date_vcp: index("idx_daily_noise_signals_date_vcp").on(t.date, t.isVcp),
  })
);
```

**작업**:
- [ ] `dailyNoiseSignals` 테이블 정의
- [ ] 인덱스 설정
- [ ] 마이그레이션 파일 생성

#### 1.2 ETL 구현

**파일**: `apps/web/src/etl/jobs/build-noise-signals.ts`

**VCP 필터 계산**:
```sql
-- ATR(14) 계산
WITH atr_calc AS (
  SELECT
    dp.symbol,
    dp.date,
    dp.close,
    dp.high,
    dp.low,
    LAG(dp.close) OVER (PARTITION BY dp.symbol ORDER BY dp.date) AS prev_close,
    GREATEST(
      dp.high - dp.low,
      ABS(dp.high - LAG(dp.close) OVER (PARTITION BY dp.symbol ORDER BY dp.date)),
      ABS(dp.low - LAG(dp.close) OVER (PARTITION BY dp.symbol ORDER BY dp.date))
    ) AS true_range
  FROM daily_prices dp
  WHERE dp.date <= (SELECT MAX(date) FROM daily_prices)
    AND dp.date >= (SELECT MAX(date) FROM daily_prices) - INTERVAL '60 days'
),
atr_values AS (
  SELECT
    symbol,
    date,
    close,
    AVG(true_range) OVER (
      PARTITION BY symbol 
      ORDER BY date 
      ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
    ) AS atr_14
  FROM atr_calc
  WHERE true_range IS NOT NULL
),
-- Bollinger Band 계산
bb_calc AS (
  SELECT
    dp.symbol,
    dp.date,
    dp.close,
    AVG(dp.close) OVER (
      PARTITION BY dp.symbol 
      ORDER BY dp.date 
      ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
    ) AS bb_middle,
    STDDEV(dp.close) OVER (
      PARTITION BY dp.symbol 
      ORDER BY dp.date 
      ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
    ) AS bb_stddev
  FROM daily_prices dp
  WHERE dp.date <= (SELECT MAX(date) FROM daily_prices)
    AND dp.date >= (SELECT MAX(date) FROM daily_prices) - INTERVAL '60 days'
),
bb_width AS (
  SELECT
    symbol,
    date,
    close,
    bb_middle,
    (bb_stddev * 2) / bb_middle AS bb_width_current,
    AVG((bb_stddev * 2) / bb_middle) OVER (
      PARTITION BY symbol 
      ORDER BY date 
      ROWS BETWEEN 59 PRECEDING AND 40 PRECEDING
    ) AS bb_width_avg_60d
  FROM bb_calc
  WHERE bb_middle > 0 AND bb_stddev IS NOT NULL
)
-- VCP 조건 판단
SELECT 
  atr.symbol,
  atr.date,
  atr.atr_14,
  (atr.atr_14 / atr.close) * 100 AS atr14_percent,
  bb.bb_width_current,
  bb.bb_width_avg_60d,
  CASE 
    WHEN (atr.atr_14 / atr.close) < 0.05 
      AND bb.bb_width_current < bb.bb_width_avg_60d * 0.8
    THEN TRUE
    ELSE FALSE
  END AS is_vcp
FROM atr_values atr
JOIN bb_width bb ON atr.symbol = bb.symbol AND atr.date = bb.date
WHERE atr.date = (SELECT MAX(date) FROM daily_prices)
```

**거래량 필터 계산** (ETL에서도 계산하여 저장, 스크리너에서 재사용):
```sql
-- 20일 평균 거래대금 및 거래량
SELECT
  dp.symbol,
  dp.date,
  AVG(dp.volume * dp.close) OVER (
    PARTITION BY dp.symbol 
    ORDER BY dp.date 
    ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
  ) AS avg_dollar_volume_20d,
  AVG(dp.volume) OVER (
    PARTITION BY dp.symbol 
    ORDER BY dp.date 
    ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
  ) AS avg_volume_20d
FROM daily_prices dp
WHERE dp.date = (SELECT MAX(date) FROM daily_prices)
```

**캔들 몸통 필터 계산** (최신 거래일만):
```sql
SELECT
  dp.symbol,
  dp.date,
  CASE 
    WHEN (dp.high - dp.low) > 0 
    THEN ABS(dp.close - dp.open) / (dp.high - dp.low)
    ELSE NULL
  END AS body_ratio
FROM daily_prices dp
WHERE dp.date = (SELECT MAX(date) FROM daily_prices)
```

**이평선 밀집 필터 계산** (최신 거래일만):
```sql
SELECT
  dm.symbol,
  dm.date,
  CASE 
    WHEN dm.ma50 > 0 
    THEN ((dm.ma20 - dm.ma50) / dm.ma50) * 100
    ELSE NULL
  END AS ma20_ma50_distance_percent
FROM daily_ma dm
WHERE dm.date = (SELECT MAX(date) FROM daily_ma)
  AND dm.ma20 IS NOT NULL
  AND dm.ma50 IS NOT NULL
```

**작업**:
- [ ] `build-noise-signals.ts` ETL 스크립트 생성
- [ ] 모든 계산 로직 통합
- [ ] `daily_noise_signals` 테이블에 upsert
- [ ] 에러 핸들링 및 로깅

#### 1.3 타입 정의

**파일**: `apps/web/src/types/screener.ts`

```typescript
export interface ScreenerParams {
  // ... 기존 필드들
  volumeFilter?: boolean;
  vcpFilter?: boolean;
  bodyFilter?: boolean;
  maConvergenceFilter?: boolean;
}
```

**작업**:
- [ ] `ScreenerParams`에 노이즈 필터 필드 추가

#### 1.4 쿼리 빌더 수정

**파일**: `apps/web/src/lib/screener/query-builder.ts`

**거래량 필터 CTE**:
```typescript
function buildVolumeFilterCTE(): SQL {
  return sql`
    WITH volume_metrics AS (
      SELECT
        dp.symbol,
        AVG(dp.volume * dp.close) OVER (
          PARTITION BY dp.symbol 
          ORDER BY dp.date 
          ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
        ) AS avg_dollar_volume_20d,
        AVG(dp.volume) OVER (
          PARTITION BY dp.symbol 
          ORDER BY dp.date 
          ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
        ) AS avg_volume_20d
      FROM daily_prices dp
      WHERE dp.date = (SELECT MAX(date) FROM daily_prices)
    )
    SELECT symbol
    FROM volume_metrics
    WHERE avg_dollar_volume_20d > 10000000
      OR avg_volume_20d > 500000
  `;
}
```

**작업**:
- [ ] `buildVolumeFilterCTE` 함수 추가
- [ ] `buildWhereFilters`에 거래량 필터 조건 추가
- [ ] `buildWhereFilters`에 캔들 몸통 필터 조건 추가
- [ ] `buildWhereFilters`에 이평선 밀집 필터 조건 추가
- [ ] `daily_noise_signals` LEFT JOIN 추가 (VCP 필터용)
- [ ] `buildScreenerQuery`에서 조건부 CTE 포함

#### 1.5 API 라우트 수정

**파일**: `apps/web/src/app/api/screener/stocks/route.ts`

**작업**:
- [ ] `parseRequestParams`에서 노이즈 필터 파라미터 파싱

---

## Phase 2: 상태 관리 (Frontend)

#### 2.1 필터 스키마 확장

**파일**: `apps/web/src/lib/filters/schema.ts`

**작업**:
- [ ] `filterSchema`에 노이즈 필터 필드 추가
- [ ] `filterDefaults`에 기본값 추가
- [ ] `buildQueryParams`에 새 필터 포함
- [ ] `buildCacheTag`에 새 필터 포함

#### 2.2 useFilterState 훅 확장

**파일**: `apps/web/src/hooks/useFilterState.ts`

**작업**:
- [ ] 노이즈 필터 상태 추가 (`useQueryState` 사용)

#### 2.3 useFilterActions 훅 수정

**파일**: `apps/web/src/hooks/useFilterActions.ts`

**작업**:
- [ ] `handleFilterApply`에서 노이즈 필터 상태 반영
- [ ] `handleFilterReset`에서 노이즈 필터 초기화
- [ ] `handleFilterChange`에 노이즈 필터 파라미터 추가

#### 2.4 필터 요약 함수

**파일**: `apps/web/src/lib/filters/summary.ts`

**작업**:
- [ ] `getNoiseFilterSummary` 함수 추가
- [ ] `FilterCategory`에 `"noise"` 추가
- [ ] `getFilterSummary`에 노이즈 필터 요약 포함

---

## Phase 3: UI 구현

#### 3.1 필터 박스 UI

**파일**: `apps/web/src/components/filters/CategoryFilterBox.tsx`

**작업**:
- [ ] `categoryConfig`에 `noise` 항목 추가

#### 3.2 필터 다이얼로그 UI

**파일**: `apps/web/src/components/filters/CategoryFilterDialog.tsx`

**작업**:
- [ ] 노이즈 필터 섹션 추가
- [ ] 각 필터를 체크박스로 표시
- [ ] 필터 설명 추가

#### 3.3 메인 스크리너 UI

**파일**: `apps/web/src/app/(screener)/FilterView.tsx`, `ScreenerClient.tsx`

**작업**:
- [ ] 노이즈 필터 박스 추가
- [ ] 필터 상태 정규화

---

## Phase 4: 테스트 및 검증

#### 4.1 단위 테스트

**작업**:
- [ ] 쿼리 빌더 테스트
- [ ] 필터 스키마 테스트
- [ ] 필터 요약 테스트

#### 4.2 ETL 테스트

**작업**:
- [ ] ETL 스크립트 테스트
- [ ] 계산 로직 검증

#### 4.3 통합 테스트

**작업**:
- [ ] API 라우트 테스트
- [ ] 수동 테스트

#### 4.4 성능 테스트

**작업**:
- [ ] 쿼리 실행 시간 벤치마크
- [ ] ETL 실행 시간 측정

---

## Phase 5: 문서화

#### 5.1 README 업데이트

**작업**:
- [ ] 노이즈 필터 섹션 추가
- [ ] ETL 파이프라인 업데이트

---

## 기술적 고려사항

### 1. ETL 실행 순서

**순서**: `prices → MA/RS → ratios → breakout-signals → noise-signals → alerts`

**이유**:
- `noise-signals`는 `daily_prices`와 `daily_ma` 데이터가 필요
- `alerts`는 `noise-signals`를 사용할 수 있음 (향후 확장)

### 2. 윈도우 함수 성능

**최적화 전략**:
- 인덱스 활용: `(symbol, date)` 복합 인덱스 확인
- 서브쿼리 최소화: CTE로 재사용
- 필요한 컬럼만 SELECT

### 3. 데이터 부족 처리

**문제**: 신규 상장 종목은 60일 데이터가 부족할 수 있음

**해결**:
- 데이터 부족 종목은 필터에서 자동 제외 (NULL 처리)
- ETL에서 최소 데이터 요구사항 확인

### 4. 필터 조합

**조건**: 모든 활성화된 노이즈 필터는 **AND 조건**으로 조합

**예시**:
- 거래량 + VCP 활성화 → 두 조건을 모두 만족하는 종목만 표시
- 거래량 + 캔들 몸통 + 이평선 밀집 활성화 → 세 조건을 모두 만족하는 종목만 표시

---

## 구현 순서

1. **Phase 1.1**: 데이터베이스 스키마 생성
2. **Phase 1.2**: ETL 구현 (VCP 필터 사전 계산)
3. **Phase 1.3**: 타입 정의
4. **Phase 1.4**: 쿼리 빌더 수정 (모든 필터 통합)
5. **Phase 1.5**: API 라우트 수정
6. **Phase 2**: 상태 관리 (스키마 → 훅 → 액션)
7. **Phase 3**: UI 구현
8. **Phase 4**: 테스트 및 검증
9. **Phase 5**: 문서화

---

## 성능 목표

- **쿼리 실행 시간**: 각 노이즈 필터 추가 시 50% 이하 증가
- **ETL 실행 시간**: `build-noise-signals` ETL이 60분 이내 완료
- **캐시 효율**: 필터 조합별로 적절한 캐시 태그 생성

