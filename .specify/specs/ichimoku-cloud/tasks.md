# 일목균형표 작업 목록

**Input**: Design documents from `/specs/ichimoku-cloud/`  
**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: 테스트는 각 Phase별로 포함됩니다.

**Organization**: Tasks are grouped by phase to enable sequential implementation.

## Format: `[ID] [P?] [Phase] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Phase]**: Which phase this task belongs to (e.g., Phase 1, Phase 2)
- Include exact file paths in descriptions

---

## Phase 1: 계산 로직 구현

### Phase 1.1: 타입 정의

- [ ] **T1.1.1** [P] [Phase 1] `apps/web/src/lib/technical-indicators.ts`: `IchimokuData` 인터페이스 추가
  - `time: string`
  - `tenkanSen: number | null`
  - `kijunSen: number | null`
  - `senkouSpanA: number | null`
  - `senkouSpanB: number | null`

### Phase 1.2: 계산 함수 구현

- [ ] **T1.2.1** [Phase 1] `apps/web/src/lib/technical-indicators.ts`: `calculateIchimokuWithTime()` 함수 구현
  - 최소 52일 데이터 요구사항 체크
  - 전환선 계산 (9일 고저 평균)
  - 기준선 계산 (26일 고저 평균)
  - 선행스팬 A 계산: (전환선 + 기준선) / 2
  - 선행스팬 B 계산 (52일 고저 평균)
  - 선행스팬 A/B를 26일 앞으로 시간 이동
  - 데이터 부족 시 null 반환

### Phase 1.3: 테스트 코드 작성 (TDD)

- [ ] **T1.3.1** [P] [Phase 1] `apps/web/src/lib/__tests__/technical-indicators.test.ts`: 일목균형표 계산 테스트 작성
  - 최소 데이터 요구사항 테스트 (52일 미만)
  - 전환선 계산 테스트
  - 기준선 계산 테스트
  - 선행스팬 A/B 계산 테스트
  - 시간 이동 로직 테스트 (26일 앞으로)
  - 엣지 케이스 테스트 (정확히 52일, 100일, 250일)

---

## Phase 2: 차트 표시 구현

### Phase 2.1: TechnicalChart 컴포넌트 수정

- [ ] **T2.1.1** [Phase 2] `apps/web/src/components/stock-detail/TechnicalChart.tsx`: `calculateIchimokuWithTime` import 추가

- [ ] **T2.1.2** [Phase 2] `apps/web/src/components/stock-detail/TechnicalChart.tsx`: `HoverData` 인터페이스에 일목균형표 필드 추가
  - `tenkanSen: number | null`
  - `kijunSen: number | null`
  - `senkouSpanA: number | null`
  - `senkouSpanB: number | null`

- [ ] **T2.1.3** [Phase 2] `apps/web/src/components/stock-detail/TechnicalChart.tsx`: `allIndicatorData`에 일목균형표 계산 추가
  - `calculateIchimokuWithTime(ohlcData)` 호출
  - `dataMap`에 일목균형표 값 추가

- [ ] **T2.1.4** [Phase 2] `apps/web/src/components/stock-detail/TechnicalChart.tsx`: 차트에 구름대(Area Series) 추가
  - 선행스팬 A/B 사이 영역 채우기
  - 색상: A > B면 초록색, A < B면 빨간색
  - 반투명 처리 (`#22c55e80`, `#ef444480`)

- [ ] **T2.1.5** [Phase 2] `apps/web/src/components/stock-detail/TechnicalChart.tsx`: 차트에 전환선(Line Series) 추가
  - 색상: 주황색 (`#f97316`)
  - 라인 두께: 1px

- [ ] **T2.1.6** [Phase 2] `apps/web/src/components/stock-detail/TechnicalChart.tsx`: 차트에 기준선(Line Series) 추가
  - 색상: 파란색 (`#3b82f6`)
  - 라인 두께: 1px

- [ ] **T2.1.7** [Phase 2] `apps/web/src/components/stock-detail/TechnicalChart.tsx`: 레이어 순서 조정
  - 캔들스틱 → 구름대 → 전환선/기준선 → 이동평균선 순서

### Phase 2.2: 호버 데이터 표시

- [ ] **T2.2.1** [Phase 2] `apps/web/src/components/stock-detail/TechnicalChart.tsx`: 호버 데이터에 일목균형표 값 추가
  - `latestData`에 일목균형표 값 포함
  - 크로스헤어 이벤트에서 일목균형표 값 업데이트

- [ ] **T2.2.2** [Phase 2] `apps/web/src/components/stock-detail/TechnicalChart.tsx`: 호버 UI에 일목균형표 값 표시
  - 전환선, 기준선, 선행스팬 A/B 값 표시

---

## Phase 3: 테스트 및 검증

### Phase 3.1: 단위 테스트

- [ ] **T3.1.1** [Phase 3] `apps/web/src/lib/__tests__/technical-indicators.test.ts`: 테스트 실행 및 통과 확인

### Phase 3.2: 통합 테스트

- [ ] **T3.2.1** [Phase 3] 수동 테스트: 일목균형표가 올바르게 계산되는지 확인
  - 전환선, 기준선 값 확인
  - 선행스팬 A/B 값 확인
  - 시간 이동 로직 확인

- [ ] **T3.2.2** [Phase 3] 수동 테스트: 차트에 일목균형표가 올바르게 표시되는지 확인
  - 구름대가 올바르게 표시되는지 확인
  - 전환선/기준선이 올바르게 표시되는지 확인
  - 색상이 올바르게 적용되는지 확인 (A > B면 초록, A < B면 빨강)

- [ ] **T3.2.3** [Phase 3] 수동 테스트: 호버 시 일목균형표 값이 올바르게 표시되는지 확인

- [ ] **T3.2.4** [Phase 3] 수동 테스트: 데이터 부족 시 일목균형표가 표시되지 않는지 확인
  - 52일 미만 데이터로 테스트

### Phase 3.3: 성능 테스트

- [ ] **T3.3.1** [Phase 3] 계산 시간 측정
  - Before: 기존 지표 계산 시간
  - After: 일목균형표 추가 후 계산 시간
  - 성능 영향 확인

- [ ] **T3.3.2** [Phase 3] 렌더링 시간 측정
  - Before: 기존 차트 렌더링 시간
  - After: 일목균형표 추가 후 렌더링 시간
  - 성능 영향 확인

---

## Phase 4: 코드 리뷰 및 검증

### Phase 4.1: 코드 리뷰

- [ ] **T4.1.1** [Phase 4] `docs/CODE_REVIEW_CHECKLIST.md` 기준으로 코드 리뷰
  - 설계 및 구조 검증
  - 타입 안전성 검증
  - 에러 핸들링 검증
  - UI/UX 안전성 검증

### Phase 4.2: 자동 검증

- [ ] **T4.2.1** [Phase 4] `yarn lint` 통과
- [ ] **T4.2.2** [Phase 4] `yarn test` 통과
- [ ] **T4.2.3** [Phase 4] `yarn build` 통과

---

## Phase 5: 문서화

### Phase 5.1: 문서 업데이트

- [ ] **T5.1.1** [Phase 5] `README.md`: 일목균형표 기능 추가 (필요 시)


