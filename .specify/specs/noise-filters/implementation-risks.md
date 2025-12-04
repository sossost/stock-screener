# 노이즈 필터 구현 시 잠재적 이슈 분석

## 🔴 Critical Issues (반드시 해결 필요)

### 1. VCP 필터의 성능 문제

**문제점**:
- ATR(14) 계산: True Range 계산 + Wilder's Smoothing (14일 윈도우)
- Bollinger Band 계산: 20일 SMA + STDDEV + 60일 평균 비교
- **60일 이상의 데이터 스캔**이 필요하여 쿼리 비용이 매우 큼

**영향**:
- 기존 쿼리도 복잡하지만, VCP 필터 추가 시 **쿼리 실행 시간이 2~3배 증가**할 가능성
- 특히 `candidates` CTE 이후에 VCP 필터를 적용하면, 모든 후보 종목에 대해 60일 데이터를 스캔해야 함

**해결 방안**:
1. **옵션 A (권장)**: VCP 필터를 ETL로 사전 계산
   - `daily_noise_signals` 테이블 생성
   - ETL에서 ATR, Bollinger Band 계산 후 저장
   - 스크리너는 JOIN만 수행
   - **참고**: `breakout-trading-filters`에서 동일한 패턴 채택 (ADR-BTF-001)

2. **옵션 B**: VCP 필터를 Phase 3로 미루고, Phase 1/2만 먼저 구현
   - 거래량, 캔들 몸통, 이평선 밀집 필터는 간단하여 성능 이슈 적음
   - VCP는 성능 최적화 후 추가

3. **옵션 C**: VCP 필터 단순화
   - Bollinger Band 대신 `STDDEV(close, 20) < (60일 평균 STDDEV) * 0.8`로 단순화
   - ATR은 유지하되, 계산 범위 최소화

### 2. 쿼리 빌더 복잡도 증가

**현재 상태**:
- `buildScreenerQuery`는 이미 복잡한 구조 (여러 CTE, LATERAL JOIN)
- `buildPrevMACTE`에서 윈도우 함수 사용 중

**추가될 복잡도**:
- 거래량 필터: 20일 평균 계산 (윈도우 함수)
- VCP 필터: ATR + Bollinger Band CTE 추가
- 이로 인해 **쿼리 가독성과 유지보수성 저하**

**해결 방안**:
- 각 필터를 별도 함수로 분리 (`buildVolumeFilterCTE`, `buildVCPFilterCTE` 등)
- 조건부 CTE 추가 (필터가 활성화된 경우만)

---

## 🟡 Medium Issues (주의 필요)

### 3. 데이터 요구사항

**확인 사항**:
- ✅ `daily_prices`: `open`, `high`, `low`, `close`, `volume` 모두 존재
- ✅ `daily_ma`: `ma20`, `ma50` 존재
- ⚠️ **VCP 필터**: 60일 이상 데이터 필요 (신규 상장 종목 제외 필요)

**해결 방안**:
- 데이터 부족 종목은 필터에서 자동 제외 (NULL 처리)

### 4. 타입 정의 확장

**필요한 변경**:
- `ScreenerParams`에 4개 boolean 필드 추가:
  - `volumeFilter?: boolean`
  - `vcpFilter?: boolean`
  - `bodyFilter?: boolean`
  - `maConvergenceFilter?: boolean`
- `filterSchema`에 필드 추가
- `FilterCategory`에 `"noise"` 추가
- `buildCacheTag`에 필터 추가

**영향**: 구조적 변경이 많지만, 기존 패턴을 따르면 문제 없음

### 5. UI 구조 확장

**필요한 변경**:
- `CategoryFilterBox`에 `"noise"` 카테고리 추가
- `CategoryFilterDialog`에 노이즈 필터 섹션 추가
- `getNoiseFilterSummary` 함수 추가

**영향**: 기존 패턴과 동일하므로 문제 없음

---

## 🟢 Low Issues (최소 영향)

### 6. 캐시 태그 길이

**현재**: `buildCacheTag`가 이미 길어짐
**추가**: 4개 필터 추가 시 태그가 더 길어짐

**영향**: 최소 (캐시 키 길이 제한은 없음)

### 7. URL 파라미터 증가

**현재**: 이미 많은 필터 파라미터 존재
**추가**: 4개 boolean 파라미터 추가

**영향**: 최소 (URL 길이 제한은 있지만, 4개 추가는 문제 없음)

---

## 📊 성능 벤치마크 권장사항

구현 전/후 성능 측정:

1. **기본 쿼리 실행 시간** (필터 없음)
2. **거래량 필터만 활성화** (20일 평균 계산)
3. **캔들 몸통 + 이평선 밀집 필터** (간단한 필터)
4. **VCP 필터 활성화** (복잡한 계산)

목표: 각 필터 추가 시 **쿼리 실행 시간이 50% 이하 증가**

---

## 🎯 권장 구현 전략

### Phase 1: 간단한 필터 먼저 (성능 이슈 적음)
1. 거래량 필터 (20일 평균 계산)
2. 캔들 몸통 필터 (최신 거래일만)
3. 이평선 밀집 필터 (최신 거래일만)

### Phase 2: 성능 최적화 후 VCP 추가
1. VCP 필터를 ETL로 사전 계산하는지 결정
2. 성능 테스트 후 구현
3. 또는 단순화된 버전으로 구현

---

## 결론

**가장 큰 이슈**: VCP 필터의 성능 문제

**권장 사항**:
1. VCP 필터는 ETL로 사전 계산하는 방식 고려 (breakout-trading-filters와 동일한 패턴)
2. 또는 Phase 1/2만 먼저 구현하고, VCP는 성능 최적화 후 추가
3. 거래량, 캔들 몸통, 이평선 밀집 필터는 성능 이슈 적으므로 바로 구현 가능

