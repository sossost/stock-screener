# breakout-trading-filters - 의사결정 기록 (ADR)

## ADR-BTF-001: 돌파/재테스트 조건을 실시간 쿼리가 아닌 ETL에서 계산

**날짜**: 2025-12-04  
**상태**: ✅ 채택  
**단계**: 구현  

### 상황

- 스크리너 메인 쿼리 안에서:
  - `confirmed_breakout`, `perfect_retest` CTE를 정의하고
  - `daily_prices` 전 범위에 대해 윈도우 함수(MAX/AVG) + EXISTS 서브쿼리를 매번 실행하는 방식으로
  - 확정 돌파 / 완벽 재테스트 조건을 **실시간으로** 계산하는 구조였다.
- 가격 필터를 켤 때마다:
  - 작은 ETL 수준의 연산이 반복 실행되어 쿼리 비용이 크고,
  - 다른 필터/정렬과 조합 시 체감 성능 저하 발생

### 고려 사항

**옵션 1**: 실시간 CTE 계산 유지  
- ✅ 추가 테이블/ETL 없이 바로 동작  
- ❌ 쿼리 복잡도와 실행 시간이 커서, MA/성장성 필터와 조합 시 느려짐  

**옵션 2**: ETL에서 신호 테이블로 사전 계산 (선택)  
- ✅ 복잡한 윈도우/EXISTS를 하루 한 번만 실행  
- ✅ 스크리너 쿼리는 JOIN + WHERE 수준으로 단순화  
- ✅ 동일 신호를 알림 등 다른 기능에서도 재사용 가능  
- ❌ ETL 파이프라인/테이블 추가 관리 필요  

### 결정

**옵션 2 채택**: ETL에서 돌파/재테스트 신호를 사전 계산 후, 스크리너는 신호 테이블만 JOIN

- `apps/web/src/etl/jobs/build-breakout-signals.ts`에서 EOD 기준(최신 거래일 - 1 거래일)의 캔들 + MA 데이터를 사용해:
  - 확정 돌파 / 완벽 재테스트 신호를 하루 한 번 계산
- 결과를 `daily_breakout_signals` 테이블에 저장:
  - `symbol`, `date`
  - `isConfirmedBreakout`, `breakoutPercent`, `volumeRatio`
  - `isPerfectRetest`, `ma20DistancePercent`
  - `(symbol, date)` 유니크 + `date + is_confirmed_breakout`, `date + is_perfect_retest` 인덱스
- 스크리너 쿼리(`query-builder.ts`)에서는:
  - `LEFT JOIN daily_breakout_signals dbs ON dbs.symbol = cand.symbol AND dbs.date = cand.d`
  - `breakoutStrategy = 'confirmed'` → `AND dbs.is_confirmed_breakout IS TRUE`
  - `breakoutStrategy = 'retest'` → `AND dbs.is_perfect_retest IS TRUE`

### 근거

1. **성능**:  
   - 복잡한 윈도우/EXISTS를 실시간으로 돌리지 않고, ETL에서 하루 한 번만 수행.  
   - 스크리너 쿼리는 기존 기본 필터 수준의 응답 속도로 유지 가능.
2. **일관성**:  
   - 동일한 돌파 조건을 사용하는 기능(스크리너, 알림 등)이 `daily_breakout_signals`를 단일 소스로 공유.
3. **테스트/운영 용이성**:  
   - 돌파/재테스트 로직을 하나의 ETL 스크립트로 모아두면, 테스트/벤치마크/모니터링 포인트가 명확해짐.

### 결과

- 스크리너는 항상 **최신 EOD 기준 신호**만 표시 (intraday는 지원하지 않음).
- ETL 파이프라인에 `build-breakout-signals` 단계가 추가되며, 실패 시:
  - 가격/MA/RS/비율은 최신이지만,
  - 돌파/재테스트 필터는 직전 성공 시점 기준으로 동작할 수 있으므로 로그/모니터링 필요.

---

## ADR-BTF-002: 정배열 정의에서 MA100 제거 (MA20 > MA50 > MA200)

**날짜**: 2025-12-04  
**상태**: ✅ 채택  
**단계**: 리팩토링  

### 상황

- 기존 정배열 정의: `MA20 > MA50 > MA100 > MA200`
- 실제 사용 시:
  - MA100까지 포함하면 필터가 지나치게 엄격해져 후보 종목 수가 크게 줄어드는 문제가 있음.
  - 알림/돌파 전략과 연계했을 때도, 유용한 케이스가 과도하게 제외되는 경향이 있음.

### 고려 사항

**옵션 1**: 기존 정의 유지  
- ✅ 과거 문서/코드와 일관성 유지  
- ❌ 실제 사용 시 필터가 너무 빡세서 활용도가 떨어짐  

**옵션 2**: MA100 제거 (`MA20 > MA50 > MA200`)  
- ✅ 실전 사용 시 더 적절한 후보 수 확보  
- ✅ 필터 설명/문서/알림 조건 등에서 정의가 단순해짐  
- ❌ 과거 “정배열”과 현재 “정배열” 의미가 달라짐 → 문서/테스트 업데이트 필요  

### 결정

**옵션 2 채택**: 정배열 정의를 `MA20 > MA50 > MA200`으로 단순화

- 적용 범위:
  - `query-builder.ts` (ordered 계산)
  - ETL(`detect-price-alerts.ts`) 알림 조건
  - 이메일/푸시 템플릿
  - README, `docs/AI_AGENT_GUIDE.md` 등 문서

### 근거

1. **실전 필터링**:  
   - MA20/50/200만으로도 “중장기 상승 추세 + 단기 모멘텀”을 충분히 포착 가능.
2. **단순성**:  
   - 차트/알림/문서에서 동일한 정의를 쓰기 쉬워짐.
3. **일관성**:  
   - 전역적으로 한 가지 정의만 유지하여 혼동을 줄임.

### 결과

- 정배열 관련 문서/테스트/예시는 모두 `MA20 > MA50 > MA200` 기준으로 맞춘다.
- 과거 데이터 해석 시 “정배열” 의미 변경을 인지해야 한다.

---

## ADR-BTF-003: breakout 신호를 향후 가격 알림에도 재사용

**날짜**: 2025-12-04  
**상태**: ⚠️ 제안  
**단계**: 스펙  

### 상황

- 현재 가격 알림(`detect-price-alerts.ts`)은 **정배열 + 20일선 돌파** 조건만 사용.
- 돌파매매 가격 필터(확정 돌파 / 완벽 재테스트)는 EOD 기준으로 `daily_breakout_signals`에 저장.
- 사용자가 “추후에 이 전략들도 알림으로 리스팅해서 구현할 것”이라고 명시함.

### 고려 사항

**옵션 1**: 알림에서 별도 쿼리/계산 사용  
- ✅ breakout 신호와 무관하게 알림 조건을 독립적으로 튜닝 가능  
- ❌ 동일 조건을 두 군데에서 각각 계산하게 되어, 로직/버그가 분리될 위험  

**옵션 2**: `daily_breakout_signals`를 알림의 단일 소스로 사용  
- ✅ 스크리너/알림이 같은 신호 정의를 공유  
- ✅ ETL 한 곳만 검증/최적화하면 됨  
- ❌ 신호 스키마 변경 시 영향 범위가 넓어짐  

### 결정

**옵션 2 제안**:  
향후 `price-alert-notifications` 확장 시,

- 새로운 알림 타입(예: `confirmed_breakout`, `perfect_retest`) 추가
- 조건 계산은 `daily_breakout_signals`를 기준으로만 수행:
  - `SELECT * FROM daily_breakout_signals WHERE date = <latest> AND is_confirmed_breakout = TRUE`
  - 또는 `is_perfect_retest = TRUE`

### 근거

1. **단일 소스**:  
   - 스크리너와 알림이 서로 다른 계산 로직을 가지지 않도록, 신호는 항상 `daily_breakout_signals` 기준.
2. **성능/안정성**:  
   - 복잡한 쿼리를 여러 곳에서 반복하지 않고, 하나의 ETL + 하나의 테이블만 관리.

### 결과

- `daily_breakout_signals` 스키마 변경 시:
  - 스크리너 + 알림 + 문서를 동시에 업데이트해야 하는 영향 범위가 생긴다.
- 알림에서 조건을 변경하고 싶을 때도,
  - 먼저 ETL/테이블 설계부터 손보는 **명시적 변경 프로세스**를 따르게 된다.
