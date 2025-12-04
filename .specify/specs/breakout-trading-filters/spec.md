# Feature Specification: 돌파매매 필터 (Breakout Trading Filters)

**Feature Branch**: `feature/breakout-trading-filters`  
**Created**: 2025-12-04
**Status**: Draft

## Overview

EOD (End of Day) 데이터 기준으로 **"어제 뚫어낸 종목"**과 **"어제 지지받고 끝난 종목"**을 찾는 두 가지 돌파매매 필터를 추가합니다.

### 사용 목적

- **장 마감 후 또는 장 시작 전**에 스크리너를 실행하여 **"오늘 공략할 후보 리스트"**를 뽑는 용도
- 실시간 돌파는 불가능하지만, **종가 기준으로 확정된 돌파**를 찾아 **추가 상승(Continuation)이나 갭상승** 확률이 높은 종목을 선별

---

## 전략 A: "어제 뚫어낸 놈" (Confirmed Breakout) 🚀

### 목표

어제 장대양봉으로 신고가를 갱신한 종목을 찾아, 오늘 **추가 상승(Continuation)이나 갭상승** 확률이 높은 종목을 선별합니다.

### 필터 조건

1. **신고가 돌파 확인**
   - 어제 종가(`close`)가 **20일 고점(high_20d)**을 갱신했는가?
   - `yesterday.close >= MAX(high) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)`

2. **거래량 폭증**
   - 어제 거래량(`volume`)이 **20일 평균 거래량의 2배 이상**인가?
   - `yesterday.volume >= (avg_volume_20d * 2.0)`

3. **강한 양봉 (꽉 찬 캔들)**
   - 윗꼬리가 전체 캔들 길이의 **20% 이내**인가?
   - `(high - close) < ((high - low) * 0.2)`
   - 즉, 종가가 고가에 가까워 강한 매수세를 보여야 함

### SQL 로직 (개념)

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

### 사용법

이 리스트에 뜬 종목은 **오늘 장 시작하자마자 시초가 갭상승** 여부를 보고 따라붙습니다.

---

## 전략 B: "어제 지지받고 끝난 놈" (Perfect Retest) 🐢

### 목표

며칠 전 돌파했다가, 어제 눌림목을 주고 **양봉(또는 도지)으로 예쁘게 마감한 종목**을 찾습니다. 가장 안전한 진입 대상입니다.

### 필터 조건

1. **추세 확인: 정배열**
   - `MA20 > MA50 > MA200`

2. **과거 돌파 이력**
   - **3일~10일 전**에 신고가(20일 고점)를 쳤었는가?
   - `EXISTS (SELECT 1 FROM daily_prices WHERE ... AND date BETWEEN yesterday - 10 days AND yesterday - 3 days AND close >= high_20d)`

3. **지지선 근처 종가**
   - 어제 종가가 **20일선 부근**인가? (오차범위 2% 내외)
   - `yesterday.close >= (ma20 * 0.98) AND yesterday.close <= (ma20 * 1.05)`
   - 살짝 떠서 지지받는 것도 인정

4. **반등 신호**
   - 어제 캔들이 **양봉**이거나 **아래꼬리가 긴 망치형**인가?
   - 양봉: `close >= open`
   - 망치형: `(open - low) > (close - open)`

### SQL 로직 (개념)

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

### 사용법

이 리스트는 **가장 안전한 진입 대상**입니다. 오늘 장 시작 후, **어제 종가를 깨지 않으면** 바로 진입합니다.

---

## 데이터 모델

### 기존 테이블 활용

- `daily_prices`: `open`, `high`, `low`, `close`, `volume`, `date`
- `daily_ma`: `ma20`, `ma50`, `ma100`, `ma200`, `date`
- 스키마 변경 없음

### 필요한 계산

- **20일 고점**: 윈도우 함수로 계산 (`MAX(high) OVER ...`)
- **20일 평균 거래량**: 윈도우 함수로 계산 (`AVG(volume) OVER ...`)
- **과거 돌파 이력**: 서브쿼리 또는 CTE로 확인

---

## API / 쿼리

### 필터 파라미터 추가

`ScreenerParams` 타입에 다음 필드 추가:

```typescript
interface ScreenerParams {
  // ... 기존 필드들
  breakoutStrategy?: "confirmed" | "retest" | null; // 전략 A 또는 B 선택
}
```

### SQL 쿼리 수정

`buildScreenerQuery` 함수에서:

1. `breakoutStrategy === "confirmed"`일 때 전략 A 조건 추가
2. `breakoutStrategy === "retest"`일 때 전략 B 조건 추가
3. 두 전략 모두 **어제 데이터** 기준으로 계산 (최신 거래일 - 1일)

---

## UI/UX

### 필터 UI

**"가격 필터"** 카테고리 또는 새로운 **"돌파매매"** 카테고리 추가:

```
┌─────────────────────────────────┐
│ 돌파매매 전략                    │
├─────────────────────────────────┤
│ ○ 없음                          │
│ ● 어제 뚫어낸 놈 (Confirmed)    │
│ ○ 어제 지지받은 놈 (Retest)      │
└─────────────────────────────────┘
```

### 필터 요약

- **전략 A 활성화 시**: "어제 신고가 뚫은 종목"
- **전략 B 활성화 시**: "어제 지지받고 고개 든 종목"

### 사용자 가이드

- **Hunter 탭 (전략 A 결과)**: "오늘의 관심주: 어제 신고가 뚫은 녀석들"  
  *Action:* "오늘 시초가가 강하면 따라붙으세요."

- **Sniper 탭 (전략 B 결과)**: "오늘의 줍줍: 어제 지지받고 고개 든 녀석들"  
  *Action:* "손절 짧게 잡고 편안하게 진입하세요."

---

## Acceptance Criteria

### 전략 A: Confirmed Breakout

- [ ] 어제 종가가 20일 고점을 갱신한 종목만 표시
- [ ] 어제 거래량이 20일 평균의 2배 이상인 종목만 표시
- [ ] 윗꼬리가 전체 캔들 길이의 20% 이내인 종목만 표시
- [ ] 세 조건을 모두 만족하는 종목만 필터링

### 전략 B: Perfect Retest

- [ ] 정배열 상태(MA20 > MA50 > MA200)인 종목만 표시
- [ ] 3~10일 전에 신고가 돌파 이력이 있는 종목만 표시
- [ ] 어제 종가가 20일선 부근(98%~105%)인 종목만 표시
- [ ] 양봉 또는 망치형 캔들인 종목만 표시
- [ ] 네 조건을 모두 만족하는 종목만 필터링

### 공통

- [ ] 필터 활성화 시 URL 파라미터에 `breakoutStrategy` 추가
- [ ] 필터 비활성화 시 모든 종목 표시 (기본 동작)
- [ ] 다른 필터와 AND 조건으로 동작
- [ ] 필터 요약에 전략 이름 표시

---

## Non-Functional Requirements

### 성능

- 쿼리 실행 시간: 기존 스크리너 쿼리와 유사한 수준 유지
- **실시간 쿼리에서 복잡한 윈도우 함수/EXISTS 계산 제거**
- EOD ETL에서 `daily_breakout_signals` 테이블에 신호를 미리 계산 후, 스크리너는 해당 테이블을 `JOIN`하여 필터링만 수행

### 데이터 정확성

- **어제 데이터** 기준 계산 (최신 거래일 - 1일)
- 주말/휴일 고려하여 실제 거래일 기준으로 계산
- 돌파/재테스트 신호는 `daily_breakout_signals`를 단일 소스로 사용 (스크리너, 알림 등 모든 소비자가 동일 데이터 사용)

---

## Future Enhancements

1. **전략 조합**: 전략 A와 B를 동시에 활성화하여 교집합 찾기
2. **파라미터 조정**: 거래량 배수(2.0), 윗꼬리 비율(20%), 지지선 오차범위(2%) 등을 사용자가 조정 가능
3. **과거 돌파 기간 조정**: 3~10일 범위를 사용자가 조정 가능
4. **추가 전략**: 다른 돌파매매 전략 추가 (예: 볼린저 밴드 돌파, 삼각수렴 돌파 등)
5. **알림 연동**: `daily_breakout_signals`를 가격 알림 ETL에서 재사용하여,
   - 정배열+20일선 돌파 알림 외에
   - 확정 돌파 / 완벽 재테스트 전략도 알림 채널(이메일/푸시)에 추가 리스팅

---

## 참고 자료

- 사용자 요구사항: EOD 데이터 기준 돌파매매 필터
- 기존 필터 구조: `apps/web/src/lib/filters/schema.ts`
- 쿼리 빌더: `apps/web/src/lib/screener/query-builder.ts`

