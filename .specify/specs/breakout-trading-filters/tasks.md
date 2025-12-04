# 돌파매매 필터 작업 목록

**Input**: Design documents from `/specs/breakout-trading-filters/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: 테스트는 각 Phase별로 포함됩니다.

**Organization**: Tasks are grouped by phase to enable sequential implementation.

## Format: `[ID] [P?] [Phase] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Phase]**: Which phase this task belongs to (e.g., Phase 1, Phase 2)
- Include exact file paths in descriptions

---

## Phase 1: 데이터 레이어 (Backend)

### Phase 1.1: 타입 정의

- [ ] **T1.1.1** [P] [Phase 1] `apps/web/src/types/screener.ts`: `ScreenerParams`에 `breakoutStrategy` 필드 추가
  - 타입: `"confirmed" | "retest" | null`
  - 기본값: `null` (필터 비활성화)

### Phase 1.2: 쿼리 빌더 수정

- [ ] **T1.2.1** [Phase 1] `apps/web/src/lib/screener/query-builder.ts`: 어제 거래일 조회 유틸리티 함수 추가
  - `getPreviousTradeDate` 함수 활용 (이미 존재)
  - 또는 새로운 CTE 생성 함수 추가

- [ ] **T1.2.2** [Phase 1] `apps/web/src/lib/screener/query-builder.ts`: 전략 A (Confirmed Breakout) CTE 생성 함수 추가
  - 함수명: `buildConfirmedBreakoutCTE()`
  - 조건:
    1. 어제 종가 >= 20일 고점
    2. 어제 거래량 >= 20일 평균 거래량 * 2.0
    3. 윗꼬리 < 전체 캔들 길이 * 0.2

- [ ] **T1.2.3** [Phase 1] `apps/web/src/lib/screener/query-builder.ts`: 전략 B (Perfect Retest) CTE 생성 함수 추가
  - 함수명: `buildPerfectRetestCTE()`
  - 조건:
    1. 정배열 (MA20 > MA50 > MA200)
    2. 3~10일 전 신고가 돌파 이력
    3. 어제 종가가 20일선 부근 (98%~105%)
    4. 양봉 또는 망치형 캔들

- [ ] **T1.2.4** [Phase 1] `apps/web/src/lib/screener/query-builder.ts`: `buildWhereFilters` 함수에 돌파매매 필터 조건 추가
  - `breakoutStrategy === "confirmed"`일 때 전략 A 조건 적용
  - `breakoutStrategy === "retest"`일 때 전략 B 조건 적용
  - `breakoutStrategy === null`일 때 필터 비활성화

- [ ] **T1.2.5** [Phase 1] `apps/web/src/lib/screener/query-builder.ts`: `buildScreenerQuery`에서 돌파매매 필터 CTE 통합
  - 전략 A/B에 따라 적절한 CTE 포함
  - `candidates` CTE와 조인

### Phase 1.3: API 라우트 수정

- [ ] **T1.3.1** [P] [Phase 1] `apps/web/src/app/api/screener/stocks/route.ts`: `parseRequestParams` 함수에서 `breakoutStrategy` 파라미터 파싱 추가
  - 기본값: `null`
  - 유효성 검사: `"confirmed" | "retest" | null`만 허용

---

## Phase 2: 상태 관리 (Frontend)

### Phase 2.1: 필터 스키마 확장

- [ ] **T2.1.1** [P] [Phase 2] `apps/web/src/lib/filters/schema.ts`: `filterSchema`에 `breakoutStrategy` 필드 추가
  ```typescript
  breakoutStrategy: z.enum(["confirmed", "retest"]).optional().nullable()
  ```

- [ ] **T2.1.2** [P] [Phase 2] `apps/web/src/lib/filters/schema.ts`: `filterDefaults`에 기본값 추가
  - `breakoutStrategy: null`

- [ ] **T2.1.3** [P] [Phase 2] `apps/web/src/lib/filters/schema.ts`: `buildQueryParams`에 새 필터 포함
  - `breakoutStrategy`가 `null`이 아닐 때만 쿼리 파라미터에 추가

- [ ] **T2.1.4** [P] [Phase 2] `apps/web/src/lib/filters/schema.ts`: `buildCacheTag`에 새 필터 포함

### Phase 2.2: useFilterState 훅 확장

- [ ] **T2.2.1** [P] [Phase 2] `apps/web/src/hooks/useFilterState.ts`: `breakoutStrategy`, `setBreakoutStrategy` 추가
  - `useQueryState`로 URL 파라미터와 동기화
  - 기본값: `null`

### Phase 2.3: useFilterActions 훅 수정

- [ ] **T2.3.1** [Phase 2] `apps/web/src/hooks/useFilterActions.ts`: `handleFilterApply`에서 새 필터 상태 반영

- [ ] **T2.3.2** [Phase 2] `apps/web/src/hooks/useFilterActions.ts`: `handleFilterReset`에서 새 필터 초기화
  - `breakoutStrategy`를 `null`로 초기화

- [ ] **T2.3.3** [Phase 2] `apps/web/src/hooks/useFilterActions.ts`: `handleFilterChange`에 새 필터 파라미터 추가

---

## Phase 3: UI 구현

### Phase 3.1: 필터 다이얼로그 UI

- [ ] **T3.1.1** [Phase 3] `apps/web/src/components/filters/CategoryFilterDialog.tsx`: "돌파매매" 섹션 추가
  - 라디오 버튼 그룹 추가
  - 옵션:
    - ○ 없음 (기본값, `null`)
    - ○ 어제 뚫어낸 놈 (Confirmed, `"confirmed"`)
    - ○ 어제 지지받은 놈 (Retest, `"retest"`)

- [ ] **T3.1.2** [Phase 3] `apps/web/src/components/filters/CategoryFilterDialog.tsx`: 라디오 버튼 상태 관리 로직 추가
  - `tempState.breakoutStrategy`와 동기화
  - `handleChange` 함수 구현

### Phase 3.2: 필터 요약

- [ ] **T3.2.1** [P] [Phase 3] `apps/web/src/lib/filters/summary.ts`: 돌파매매 필터 요약 로직 추가
  - 전략 A 활성화 시: "어제 신고가 뚫은 종목"
  - 전략 B 활성화 시: "어제 지지받고 고개 든 종목"
  - `getMAFilterSummary` 또는 새로운 함수에 추가

---

## Phase 4: 테스트 및 검증

### Phase 4.1: 기능 테스트

- [ ] **T4.1.1** [P] [Phase 4] 전략 A 필터 테스트 작성
  - 신고가 돌파 조건 확인
  - 거래량 폭증 조건 확인
  - 강한 양봉 조건 확인
  - 세 조건 모두 만족하는 종목만 필터링되는지 확인

- [ ] **T4.1.2** [P] [Phase 4] 전략 B 필터 테스트 작성
  - 정배열 조건 확인
  - 과거 돌파 이력 확인
  - 20일선 부근 조건 확인
  - 양봉/망치형 캔들 조건 확인
  - 네 조건 모두 만족하는 종목만 필터링되는지 확인

- [ ] **T4.1.3** [P] [Phase 4] 필터 해제 테스트
  - `breakoutStrategy`를 `null`로 설정 시 모든 종목 표시되는지 확인

- [ ] **T4.1.4** [P] [Phase 4] URL 쿼리 파라미터 테스트
  - `?breakoutStrategy=confirmed` 파라미터로 필터 적용되는지 확인
  - `?breakoutStrategy=retest` 파라미터로 필터 적용되는지 확인

### Phase 4.2: 엣지 케이스 테스트

- [ ] **T4.2.1** [P] [Phase 4] 어제 데이터가 없는 경우 처리 테스트
  - 주말/휴일 시나리오
  - 빈 결과 반환 확인

- [ ] **T4.2.2** [P] [Phase 4] 20일 데이터가 부족한 종목 처리 테스트
  - NULL 처리 확인
  - 필터링에서 제외되는지 확인

- [ ] **T4.2.3** [P] [Phase 4] 과거 돌파 이력이 없는 종목 처리 테스트 (전략 B)
  - 필터링에서 제외되는지 확인

- [ ] **T4.2.4** [P] [Phase 4] 필터 상태 유지 확인 테스트
  - 새로고침 후 필터 상태 유지되는지 확인
  - URL 파라미터와 동기화되는지 확인

### Phase 4.3: 성능 테스트

- [ ] **T4.3.1** [P] [Phase 4] ETL 기반 성능 측정
  - `build-breakout-signals` 실행 시간 벤치마크
  - 기존 스크리너 쿼리(가격필터 OFF)와 비교하여 병목이 없는지 확인

- [ ] **T4.3.2** [P] [Phase 4] 인덱스 활용 확인
  - 쿼리 실행 계획 분석
  - 필요 시 인덱스 추가 제안

- [ ] **T4.3.3** [F] [Phase 4] 알림 연동 대비 점검
  - `daily_breakout_signals`를 가격 알림 ETL(`detect-price-alerts`)에서 재사용할 수 있도록 스키마/컬럼 정의 검토
  - 향후 “확정 돌파 / 완벽 재테스트 알림”을 추가할 때, 별도 재계산 없이 해당 테이블을 기준으로 리스팅 가능하도록 보장

---

## 구현 우선순위

### Phase 1 (필수)
1. T1.1.1: 타입 정의
2. T1.2.1: 어제 거래일 조회
3. T1.2.2: 전략 A CTE 생성
4. T1.2.4: WHERE 절 필터 조건 추가
5. T1.3.1: API 파라미터 파싱

### Phase 2 (필수)
1. T2.1.1 ~ T2.1.4: 필터 스키마 확장
2. T2.2.1: useFilterState 확장
3. T2.3.1 ~ T2.3.3: useFilterActions 수정

### Phase 3 (필수)
1. T3.1.1 ~ T3.1.2: 필터 다이얼로그 UI
2. T3.2.1: 필터 요약

### Phase 4 (선택)
- 기본 기능 테스트 후 진행
- 성능 테스트는 프로덕션 배포 전 필수

---

## 참고

- 스펙 문서: `.specify/specs/breakout-trading-filters/spec.md`
- 플랜 문서: `.specify/specs/breakout-trading-filters/plan.md`
- 기존 필터 구현 참고: `.specify/specs/ma-above-filter/`
- 날짜 유틸리티: `apps/web/src/etl/utils/date-helpers.ts`

