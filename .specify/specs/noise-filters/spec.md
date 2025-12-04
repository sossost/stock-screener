# Feature Specification: 노이즈 필터 (Noise Filters)

**Feature Branch**: `feature/noise-filters`  
**Created**: 2025-12-05  
**Status**: ✅ Completed

## Overview

스크리너에서 **"노이즈가 적고 깔끔한 종목"**만 선별하기 위한 4가지 필터 그룹을 추가합니다. 소외주, 잡주, 속임수가 많은 종목을 걸러내고, 기관/세력이 관리하는 품질 좋은 종목만 남깁니다.

### 사용 목적

- **유동성 확보**: 거래량이 적은 종목은 매도 시 리스크가 큼
- **안전한 진입**: 이미 너무 많이 터진 종목이 아닌, 폭발 직전 종목 선별
- **깔끔한 차트**: 지저분한 캔들 패턴을 가진 종목 제외
- **이격도 관리**: 이평선이 벌어진 종목(고점 추격) 대신 밀집된 종목(저점 진입) 선별

---

## 필터 1: 거래량 필터 (Volume Filter) 📉

### 목표

**"인기 없는 놈은 쳐낸다"**

거래량이 적은 종목은 차트가 지저분하고(속임수가 많음), 매도 시 유동성 부족으로 인한 리스크가 큽니다. 기관/세력이 관리하는 종목만 남깁니다.

### 필터 조건

**OR 조건** (둘 중 하나만 만족하면 통과):

1. **평균 거래대금(20일) > $10M (천만 달러)**
   - `AVG(volume * close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) > 10,000,000`

2. **평균 거래량(20일) > 500,000주**
   - `AVG(volume) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) > 500,000`

### 구현 방식: ETL 사전 계산

**⚠️ 성능 최적화**: 거래량 필터는 20일 윈도우 함수 계산이 필요하므로, ETL에서 사전 계산하여 `daily_noise_signals` 테이블에 저장합니다. 스크리너에서는 저장된 값을 재사용합니다.

**ETL 계산 로직** (`apps/web/src/etl/jobs/build-noise-signals.ts`):

```sql
-- 최신 거래일 기준으로 20일 평균 거래대금 및 거래량 계산
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

**스크리너 쿼리** (`query-builder.ts`):

```sql
-- daily_noise_signals 테이블을 JOIN하여 필터링
LEFT JOIN daily_noise_signals dns ON dns.symbol = cand.symbol AND dns.date::date = cand.d
WHERE 
  (dns.avg_dollar_volume_20d > 10000000  -- $10M
   OR dns.avg_volume_20d > 500000)      -- 500K shares
```

### 효과

- 소외주, 잡주를 걸러냄
- 기관/세력이 관리하는 종목만 남음
- 매도 시 유동성 확보

---

## 필터 2: 변동성 압축 필터 (VCP - Volatility Compression Pattern) 🌊

### 목표

**"용수철처럼 눌린 놈만 찾는다"**

이미 너무 많이 터져서 힘이 빠진 종목이 아닌, 폭발 직전에 힘을 모으고 있는 종목을 찾습니다. 변동성이 압축되어 곧 큰 움직임이 예상되는 패턴입니다.

### 필터 조건

**AND 조건** (둘 다 만족해야 통과):

1. **ATR(14) / 현재가 < 5%**
   - 변동성이 너무 크지 않은 상태
   - `ATR(14) / close < 0.05`

2. **Bollinger Band 폭이 좁아짐**
   - 최근 20일 Bollinger Band 폭이 과거 60일 평균보다 작음
   - `(BB_upper - BB_lower) / BB_middle < (60일 평균 BB 폭) * 0.8`
   - 또는 더 간단하게: `STDDEV(close, 20) / SMA(close, 20) < (60일 평균) * 0.8`

### 구현 방식: ETL 사전 계산

**⚠️ 성능 최적화**: VCP 필터는 ATR과 Bollinger Band 계산이 복잡하여 실시간 쿼리에서 성능 문제가 발생할 수 있습니다. 따라서 `breakout-trading-filters`와 동일하게 **ETL에서 사전 계산**하는 방식을 채택합니다.

**ETL 계산 로직** (`apps/web/src/etl/jobs/build-noise-signals.ts`):

```sql
-- 최신 거래일 기준으로 VCP 신호 계산
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
    -- ATR(14) 계산 (Wilder's Smoothing)
    AVG(true_range) OVER (
      PARTITION BY symbol 
      ORDER BY date 
      ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
    ) AS atr_14
  FROM atr_calc
  WHERE true_range IS NOT NULL
),
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
bb_width_all AS (
  SELECT
    symbol,
    date,
    close,
    bb_middle,
    (bb_stddev * 2) / bb_middle AS bb_width_current,
    AVG((bb_stddev * 2) / bb_middle) OVER (
      PARTITION BY symbol 
      ORDER BY date 
      ROWS BETWEEN 59 PRECEDING AND 20 PRECEDING
    ) AS bb_width_avg_60d
  FROM bb_calc
  WHERE bb_middle > 0 AND bb_stddev IS NOT NULL
),
bb_width AS (
  SELECT
    symbol,
    date,
    close,
    bb_middle,
    bb_width_current,
    bb_width_avg_60d
  FROM bb_width_all
  WHERE date = (SELECT MAX(date) FROM daily_prices)
)
SELECT 
  atr.symbol,
  atr.date,
  CASE 
    WHEN atr.atr_14 / atr.close < 0.05 
      AND bb.bb_width_current < bb.bb_width_avg_60d * 0.8
    THEN TRUE
    ELSE FALSE
  END AS is_vcp
FROM atr_values atr
JOIN bb_width bb ON atr.symbol = bb.symbol AND atr.date = bb.date
WHERE atr.date = (SELECT MAX(date) FROM daily_prices)
```

**스크리너 쿼리** (`query-builder.ts`):

```sql
-- daily_noise_signals 테이블을 JOIN하여 필터링
LEFT JOIN daily_noise_signals dns ON dns.symbol = cand.symbol AND dns.date::date = cand.d
WHERE dns.is_vcp IS TRUE
```

### 데이터베이스 스키마

**테이블**: `daily_noise_signals`

**중요**: `bb_width_avg_60d` 계산 시 윈도우 함수가 과거 데이터를 참조할 수 있도록, `bb_width_all` CTE에서 모든 날짜에 대해 윈도우 함수를 계산한 후, `bb_width` CTE에서 최신 거래일만 필터링합니다. 이를 통해 60일 평균 BB 폭이 정확하게 계산됩니다.

```typescript
{
  symbol: string;
  date: string; // 'YYYY-MM-DD'
  // 거래량 필터 (20일 평균 거래대금/거래량)
  avgDollarVolume20d: numeric | null;
  avgVolume20d: numeric | null;
  // VCP 필터
  atr14: numeric | null;
  atr14Percent: numeric | null; // ATR(14) / close * 100
  bbWidthCurrent: numeric | null;
  bbWidthAvg60d: numeric | null;
  isVcp: boolean; // ATR < 5% AND BB 폭 압축
  // 캔들 몸통 필터 (최신 거래일만)
  bodyRatio: numeric | null; // (close - open) / (high - low)
  // 이평선 밀집 필터 (최신 거래일만)
  ma20Ma50DistancePercent: numeric | null; // (MA20 - MA50) / MA50 * 100
  createdAt: timestamp;
}
```

### 효과

- 이미 20~30% 급등한 종목 제외
- 안전하게 진입할 수 있는 초기 단계 종목 선별
- 곧 큰 움직임이 예상되는 패턴 포착
- **성능**: 복잡한 계산을 ETL에서 하루 한 번만 수행하여 스크리너 쿼리 성능 유지

---

## 필터 3: 캔들 몸통 필터 (Body Filter) 📏

### 목표

**"지저분한 꼬리는 쳐낸다"**

윗꼬리가 길다는 것은 매도세가 강하다는 뜻입니다. 깔끔한 양봉만 찾아 비석형 캔들(하락 반전 신호)이나 십자가형 도지 캔들을 걸러냅니다.

### 필터 조건

**최신 거래일 기준**:

- `(종가 - 시가) > (고가 - 저가) * 0.6`
- 즉, 캔들 전체 길이 중 몸통이 60% 이상이어야 함

### 구현 방식: ETL 사전 계산

**⚠️ 성능 최적화**: 캔들 몸통 필터는 최신 거래일만 필요하지만, 일관성을 위해 ETL에서 계산하여 `daily_noise_signals` 테이블에 저장합니다. 스크리너에서는 저장된 값을 재사용합니다.

**ETL 계산 로직** (`apps/web/src/etl/jobs/build-noise-signals.ts`):

```sql
-- 최신 거래일 기준으로 캔들 몸통 비율 계산
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
  AND dp.close IS NOT NULL
  AND dp.open IS NOT NULL
  AND dp.high IS NOT NULL
  AND dp.low IS NOT NULL
```

**스크리너 쿼리** (`query-builder.ts`):

```sql
-- daily_noise_signals 테이블을 JOIN하여 필터링
LEFT JOIN daily_noise_signals dns ON dns.symbol = cand.symbol AND dns.date::date = cand.d
WHERE dns.body_ratio > 0.6
```

### 효과

- 윗꼬리가 긴 비석형 캔들 제외
- 십자가형 도지 캔들 제외
- 깔끔한 양봉/음봉만 선별

---

## 필터 4: 이평선 밀집 필터 (MA Convergence Filter) 🧱

### 목표

**"힘이 응축된 놈"**

이평선이 벌어져 있으면(이격 과다) 다시 좁혀지려는 성질 때문에 조정이 옵니다. 반대로 뭉쳐 있으면 위로 튈 준비가 된 겁니다.

### 필터 조건

**최신 거래일 기준**:

- `(MA20 - MA50) / MA50 < 3%`
- 즉, 20일선과 50일선 간격이 3% 이내

### 구현 방식: ETL 사전 계산

**⚠️ 성능 최적화**: 이평선 밀집 필터는 최신 거래일만 필요하지만, 일관성을 위해 ETL에서 계산하여 `daily_noise_signals` 테이블에 저장합니다. 스크리너에서는 저장된 값을 재사용합니다.

**ETL 계산 로직** (`apps/web/src/etl/jobs/build-noise-signals.ts`):

```sql
-- 최신 거래일 기준으로 MA20-MA50 간격 계산
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

**스크리너 쿼리** (`query-builder.ts`):

```sql
-- daily_noise_signals 테이블을 JOIN하여 필터링
LEFT JOIN daily_noise_signals dns ON dns.symbol = cand.symbol AND dns.date::date = cand.d
WHERE ABS(dns.ma20_ma50_distance_percent) < 3
```

### 효과

- 이격도가 너무 벌어진 고점 추격 매수 방지
- 손절 라인이 명확한 자리 찾기
- 위로 튈 준비가 된 종목 선별

---

## UI/UX 설계

### 필터 그룹

- **카테고리**: "노이즈 필터" (기존 "가격 필터"와 별도 그룹)
- **아이콘**: `Filter` 또는 `Sliders` (lucide-react)
- **위치**: `CategoryFilterBox`에 새 항목 추가

### 필터 옵션

각 필터는 **독립적으로 ON/OFF** 가능:

1. ✅ 거래량 필터
2. ✅ 변동성 압축 (VCP)
3. ✅ 캔들 몸통 필터
4. ✅ 이평선 밀집 필터

### 필터 요약

- 활성화된 필터가 있으면: "거래량, VCP, 캔들몸통, 이평선밀집" (활성화된 것만 표시)
- 활성화된 필터가 없으면: "노이즈필터 없음"

---

## 기술적 고려사항

### 데이터 요구사항

1. **거래량 필터**
   - `daily_prices`: `volume`, `close`, `date`
   - 윈도우 함수로 20일 평균 계산

2. **VCP 필터**
   - `daily_prices`: `high`, `low`, `close`, `date`
   - ATR 계산: 최소 14일 + 1일 데이터 필요
   - Bollinger Band 계산: 최소 20일 + 60일 평균 계산용 데이터 필요

3. **캔들 몸통 필터**
   - `daily_prices`: `open`, `high`, `low`, `close`, `date`
   - 최신 거래일 데이터만 필요

4. **이평선 밀집 필터**
   - `daily_ma`: `ma20`, `ma50`, `date`
   - 최신 거래일 데이터만 필요

### 성능 고려사항

- **VCP 필터**: ATR과 Bollinger Band 계산이 복잡하므로 성능 최적화 필요
- **윈도우 함수**: 거래량 필터에서 20일 평균 계산 시 윈도우 함수 사용
- **인덱스**: `daily_prices.date`, `daily_ma.date` 인덱스 확인

### 계산 방식

- **ETL 사전 계산**: 모든 노이즈 필터는 ETL에서 하루 한 번 계산하여 `daily_noise_signals` 테이블에 저장
  - **거래량 필터**: 20일 평균 거래대금/거래량 계산
  - **VCP 필터**: ATR(14) + Bollinger Band 계산
  - **캔들 몸통 필터**: 최신 거래일 몸통 비율 계산
  - **이평선 밀집 필터**: 최신 거래일 MA20-MA50 간격 계산
- **스크리너 쿼리**: `daily_noise_signals` 테이블을 JOIN하여 필터링만 수행
- **이유**: 
  - 일관성: 모든 노이즈 필터를 동일한 방식으로 관리
  - 성능: 복잡한 계산을 ETL에서 하루 한 번만 수행하여 스크리너 쿼리 성능 유지
  - 확장성: 향후 노이즈 필터 추가 시 동일한 패턴 적용 가능

---

## 구현 우선순위

1. **Phase 1**: 거래량 필터 + 캔들 몸통 필터 (간단한 필터)
2. **Phase 2**: 이평선 밀집 필터
3. **Phase 3**: 변동성 압축 필터 (VCP) - 가장 복잡

**⚠️ 성능 고려사항**: VCP 필터는 ATR과 Bollinger Band 계산이 복잡하여 쿼리 성능에 큰 영향을 줄 수 있습니다. `breakout-trading-filters`와 동일하게 ETL로 사전 계산하는 방식을 고려해야 합니다. 자세한 내용은 `implementation-risks.md` 참고.

---

## 참고사항

### Bollinger Band 계산 단순화

Bollinger Band 폭 계산이 복잡할 경우, 다음으로 단순화 가능:
- `STDDEV(close, 20) / SMA(close, 20) < (60일 평균) * 0.8`
- 또는 더 단순하게: `STDDEV(close, 20) < (60일 평균 STDDEV) * 0.8`

### ATR 계산

기존 `calculateATR` 함수가 있지만, SQL에서 직접 계산하는 것이 성능상 유리할 수 있습니다.

### 필터 조합

4가지 필터는 **AND 조건**으로 조합됩니다. 즉, 모든 활성화된 필터를 만족하는 종목만 표시됩니다.

