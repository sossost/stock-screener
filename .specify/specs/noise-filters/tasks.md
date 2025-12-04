# 노이즈 필터 작업 목록

**Input**: Design documents from `/specs/noise-filters/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: 테스트는 각 Phase별로 포함됩니다.

**Organization**: Tasks are grouped by phase to enable sequential implementation.

## Format: `[ID] [P?] [Phase] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Phase]**: Which phase this task belongs to (e.g., Phase 1, Phase 2)
- Include exact file paths in descriptions

---

## Phase 1: 데이터 레이어 (Backend) - ETL 및 스키마

### Phase 1.1: 데이터베이스 스키마

- [ ] **T1.1.1** [Phase 1] `apps/web/src/db/schema.ts`: `dailyNoiseSignals` 테이블 추가
  - 컬럼:
    - `symbol`, `date` (PK)
    - `avgDollarVolume20d`, `avgVolume20d` (거래량 필터용)
    - `atr14`, `atr14Percent`, `bbWidthCurrent`, `bbWidthAvg60d`, `isVcp` (VCP 필터용)
    - `bodyRatio` (캔들 몸통 필터용, 최신 거래일만)
    - `ma20Ma50DistancePercent` (이평선 밀집 필터용, 최신 거래일만)
    - `createdAt`
  - 인덱스: `(symbol, date)` 유니크, `(date, is_vcp)` 인덱스

- [ ] **T1.1.2** [Phase 1] `apps/web/drizzle`: 마이그레이션 파일 생성
  - `yarn db:gen` 실행
  - 마이그레이션 파일 확인

### Phase 1.2: ETL 구현 (VCP 필터 사전 계산)

- [x] **T1.2.1** [Phase 1] `apps/web/src/etl/jobs/build-noise-signals.ts`: ETL 스크립트 생성
  - 최신 거래일 기준으로 노이즈 신호 계산
  - VCP 필터: ATR(14) + Bollinger Band 계산
  - 거래량 필터: 20일 평균 거래대금/거래량 계산 (ETL에서도 계산하여 저장, 스크리너에서 재사용)
  - 캔들 몸통 필터: 최신 거래일 몸통 비율 계산
  - 이평선 밀집 필터: 최신 거래일 MA20-MA50 간격 계산
  - `daily_noise_signals` 테이블에 upsert
  - **수정**: `bb_width_avg_60d` 계산 시 윈도우 함수가 과거 데이터를 참조할 수 있도록 `bb_width_all` CTE에서 모든 날짜에 대해 계산 후 최신 거래일만 필터링

- [ ] **T1.2.2** [Phase 1] `apps/web/package.json`: ETL 스크립트 명령어 추가
  - `etl:noise-signals`: `build-noise-signals.ts` 실행

- [ ] **T1.2.3** [Phase 1] `.github/workflows/etl-daily.yml`: ETL 파이프라인에 `noise-signals` job 추가
  - 실행 순서: `prices → MA/RS → ratios → breakout-signals → noise-signals → alerts`
  - `etl-noise-signals` job 생성
  - `etl-detect-alerts`가 `etl-noise-signals`에 의존하도록 수정

### Phase 1.3: 타입 정의

- [ ] **T1.3.1** [P] [Phase 1] `apps/web/src/types/screener.ts`: `ScreenerParams`에 노이즈 필터 필드 추가
  ```typescript
  volumeFilter?: boolean;
  vcpFilter?: boolean;
  bodyFilter?: boolean;
  maConvergenceFilter?: boolean;
  ```

### Phase 1.4: 쿼리 빌더 수정

- [ ] **T1.4.1** [Phase 1] `apps/web/src/lib/screener/query-builder.ts`: 거래량 필터 CTE 추가
  - 함수명: `buildVolumeFilterCTE()`
  - 20일 평균 거래대금 및 거래량 계산
  - 조건: `avgDollarVolume20d > 10M OR avgVolume20d > 500K`

- [ ] **T1.4.2** [Phase 1] `apps/web/src/lib/screener/query-builder.ts`: 캔들 몸통 필터 조건 추가
  - `buildWhereFilters`에 조건 추가
  - 최신 거래일 기준: `ABS(close - open) > ((high - low) * 0.6)`

- [ ] **T1.4.3** [Phase 1] `apps/web/src/lib/screener/query-builder.ts`: 이평선 밀집 필터 조건 추가
  - `buildWhereFilters`에 조건 추가
  - `daily_ma` JOIN 후: `ABS(ma20 - ma50) / ma50 < 0.03`

- [ ] **T1.4.4** [Phase 1] `apps/web/src/lib/screener/query-builder.ts`: VCP 필터 JOIN 추가
  - `daily_noise_signals` LEFT JOIN
  - `vcpFilter = true`일 때만 JOIN
  - 조건: `AND dns.is_vcp IS TRUE`

- [ ] **T1.4.5** [Phase 1] `apps/web/src/lib/screener/query-builder.ts`: `buildWhereFilters`에 모든 노이즈 필터 조건 통합
  - 거래량 필터: CTE 결과 사용
  - VCP 필터: `daily_noise_signals` JOIN 결과 사용
  - 캔들 몸통 필터: 실시간 계산
  - 이평선 밀집 필터: 실시간 계산

### Phase 1.5: API 라우트 수정

- [ ] **T1.5.1** [P] [Phase 1] `apps/web/src/app/api/screener/stocks/route.ts`: `parseRequestParams` 함수에서 노이즈 필터 파라미터 파싱 추가
  - `volumeFilter`, `vcpFilter`, `bodyFilter`, `maConvergenceFilter`
  - 기본값: `false`
  - 유효성 검사: boolean만 허용

---

## Phase 2: 상태 관리 (Frontend)

### Phase 2.1: 필터 스키마 확장

- [ ] **T2.1.1** [P] [Phase 2] `apps/web/src/lib/filters/schema.ts`: `filterSchema`에 노이즈 필터 필드 추가
  ```typescript
  volumeFilter: booleanString.default(filterDefaults.volumeFilter),
  vcpFilter: booleanString.default(filterDefaults.vcpFilter),
  bodyFilter: booleanString.default(filterDefaults.bodyFilter),
  maConvergenceFilter: booleanString.default(filterDefaults.maConvergenceFilter),
  ```

- [ ] **T2.1.2** [P] [Phase 2] `apps/web/src/lib/filters/schema.ts`: `filterDefaults`에 기본값 추가
  ```typescript
  volumeFilter: false,
  vcpFilter: false,
  bodyFilter: false,
  maConvergenceFilter: false,
  ```

- [ ] **T2.1.3** [P] [Phase 2] `apps/web/src/lib/filters/schema.ts`: `buildQueryParams`에 새 필터 포함
  - 각 필터가 `true`일 때만 쿼리 파라미터에 추가

- [ ] **T2.1.4** [P] [Phase 2] `apps/web/src/lib/filters/schema.ts`: `buildCacheTag`에 새 필터 포함
  - 노이즈 필터 4개를 캐시 태그에 포함

- [ ] **T2.1.5** [P] [Phase 2] `apps/web/src/lib/filters/schema.ts`: `parseFilters`에서 노이즈 필터 파싱 처리
  - URL 파라미터가 없으면 `false`로 설정

### Phase 2.2: useFilterState 훅 확장

- [ ] **T2.2.1** [P] [Phase 2] `apps/web/src/hooks/useFilterState.ts`: 노이즈 필터 상태 추가
  - `volumeFilter`, `setVolumeFilter`
  - `vcpFilter`, `setVcpFilter`
  - `bodyFilter`, `setBodyFilter`
  - `maConvergenceFilter`, `setMaConvergenceFilter`
  - `useQueryState`로 URL 파라미터와 동기화
  - 기본값: `false`

### Phase 2.3: useFilterActions 훅 수정

- [ ] **T2.3.1** [Phase 2] `apps/web/src/hooks/useFilterActions.ts`: `handleFilterApply`에서 노이즈 필터 상태 반영

- [ ] **T2.3.2** [Phase 2] `apps/web/src/hooks/useFilterActions.ts`: `handleFilterReset`에서 노이즈 필터 초기화
  - `category === "noise"`일 때 모든 노이즈 필터를 `false`로 초기화

- [ ] **T2.3.3** [Phase 2] `apps/web/src/hooks/useFilterActions.ts`: `handleFilterChange`에 노이즈 필터 파라미터 추가

- [ ] **T2.3.4** [Phase 2] `apps/web/src/hooks/useFilterActions.ts`: `debouncedSaveFilters`에 노이즈 필터 포함

### Phase 2.4: 필터 요약 함수

- [ ] **T2.4.1** [P] [Phase 2] `apps/web/src/lib/filters/summary.ts`: `getNoiseFilterSummary` 함수 추가
  - 활성화된 노이즈 필터 목록 반환
  - 예: "거래량, VCP, 캔들몸통" 또는 "노이즈필터 없음"

- [ ] **T2.4.2** [P] [Phase 2] `apps/web/src/lib/filters/summary.ts`: `FilterCategory`에 `"noise"` 추가

- [ ] **T2.4.3** [P] [Phase 2] `apps/web/src/lib/filters/summary.ts`: `FilterState` 인터페이스에 노이즈 필터 필드 추가

- [ ] **T2.4.4** [P] [Phase 2] `apps/web/src/lib/filters/summary.ts`: `getFilterSummary`에 노이즈 필터 요약 포함

---

## Phase 3: UI 구현

### Phase 3.1: 필터 박스 UI

- [ ] **T3.1.1** [P] [Phase 3] `apps/web/src/components/filters/CategoryFilterBox.tsx`: 노이즈 필터 카테고리 추가
  - `categoryConfig`에 `noise` 항목 추가
  - 라벨: "노이즈"
  - 아이콘: `Filter` 또는 `Sliders` (lucide-react)
  - `getNoiseFilterSummary` 사용

### Phase 3.2: 필터 다이얼로그 UI

- [ ] **T3.2.1** [Phase 3] `apps/web/src/components/filters/CategoryFilterDialog.tsx`: 노이즈 필터 섹션 추가
  - `category === "noise"`일 때 노이즈 필터 옵션 표시
  - 각 필터를 체크박스로 표시:
    1. ✅ 거래량 필터: "인기 없는 놈은 쳐낸다" (설명 포함)
    2. ✅ 변동성 압축 (VCP): "용수철처럼 눌린 놈만 찾는다" (설명 포함)
    3. ✅ 캔들 몸통 필터: "지저분한 꼬리는 쳐낸다" (설명 포함)
    4. ✅ 이평선 밀집 필터: "힘이 응축된 놈" (설명 포함)

- [ ] **T3.2.2** [Phase 3] `apps/web/src/components/filters/CategoryFilterDialog.tsx`: `initialTempState`에 노이즈 필터 포함
  - `category === "noise"`일 때 노이즈 필터 상태 초기화

- [ ] **T3.2.3** [Phase 3] `apps/web/src/components/filters/CategoryFilterDialog.tsx`: `handleReset`에 노이즈 필터 초기화 로직 추가

### Phase 3.3: 메인 스크리너 UI

- [ ] **T3.3.1** [P] [Phase 3] `apps/web/src/app/(screener)/FilterView.tsx`: 노이즈 필터 박스 추가
  - `CategoryFilterBox`에 `category="noise"` 추가

- [ ] **T3.3.2** [P] [Phase 3] `apps/web/src/app/(screener)/ScreenerClient.tsx`: `normalizedFilterState`에 노이즈 필터 포함

---

## Phase 4: 테스트 및 검증

### Phase 4.1: 단위 테스트

- [ ] **T4.1.1** [Phase 4] `apps/web/src/lib/__tests__/screener-query-builder-noise.test.ts`: 노이즈 필터 쿼리 테스트 작성
  - 거래량 필터 CTE 테스트
  - VCP 필터 JOIN 테스트
  - 캔들 몸통 필터 조건 테스트
  - 이평선 밀집 필터 조건 테스트

- [ ] **T4.1.2** [Phase 4] `apps/web/src/lib/filters/__tests__/schema.test.ts`: 노이즈 필터 스키마 파싱 테스트 추가

- [ ] **T4.1.3** [Phase 4] `apps/web/src/lib/filters/__tests__/summary.test.ts`: 노이즈 필터 요약 테스트 추가

### Phase 4.2: ETL 테스트

- [ ] **T4.2.1** [Phase 4] `apps/web/src/etl/jobs/__tests__/build-noise-signals.test.ts`: ETL 스크립트 테스트 작성
  - VCP 계산 로직 테스트
  - 거래량 계산 로직 테스트
  - 캔들 몸통 계산 로직 테스트
  - 이평선 밀집 계산 로직 테스트

### Phase 4.3: 통합 테스트

- [ ] **T4.3.1** [Phase 4] `apps/web/src/app/api/screener/stocks/__tests__/route.test.ts`: 노이즈 필터 파라미터 파싱 테스트 추가

- [ ] **T4.3.2** [Phase 4] 수동 테스트: 각 노이즈 필터가 올바르게 작동하는지 확인
  - 거래량 필터: 소외주 제외 확인
  - VCP 필터: 변동성 압축 종목만 표시 확인
  - 캔들 몸통 필터: 깔끔한 캔들만 표시 확인
  - 이평선 밀집 필터: 이평선이 뭉친 종목만 표시 확인

### Phase 4.4: 성능 테스트

- [ ] **T4.4.1** [Phase 4] 쿼리 실행 시간 벤치마크
  - 노이즈 필터 없음
  - 거래량 필터만 활성화
  - 캔들 몸통 + 이평선 밀집 필터 활성화
  - VCP 필터 활성화
  - 모든 노이즈 필터 활성화

- [ ] **T4.4.2** [Phase 4] ETL 실행 시간 측정
  - `build-noise-signals` ETL 실행 시간 확인
  - 타임아웃 설정 확인 (60분 이내)

---

## Phase 5: 문서화

### Phase 5.1: README 업데이트

- [ ] **T5.1.1** [Phase 5] `README.md`: 노이즈 필터 섹션 추가
  - 4가지 필터 설명
  - ETL 파이프라인에 `noise-signals` 추가

### Phase 5.2: ETL 문서 업데이트

- [ ] **T5.2.1** [Phase 5] `.github/workflows/etl-daily.yml`: 주석에 실행 순서 명시
  - `prices → MA/RS → ratios → breakout-signals → noise-signals → alerts`

