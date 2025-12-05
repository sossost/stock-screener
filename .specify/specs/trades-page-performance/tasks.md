# 매매일지 페이지 성능 개선 작업 목록

**Input**: Design documents from `/specs/trades-page-performance/`  
**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: 테스트는 각 Phase별로 포함됩니다.

**Organization**: Tasks are grouped by phase to enable sequential implementation.

## Format: `[ID] [P?] [Phase] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Phase]**: Which phase this task belongs to (e.g., Phase 1, Phase 2)
- Include exact file paths in descriptions

---

## Phase 1: Suspense 추가

### Phase 1.1: 로딩 스켈레톤 컴포넌트

- [ ] **T1.1.1** [Phase 1] `apps/web/src/app/trades/page.tsx`: `TradesSkeleton` 컴포넌트 추가
  - 실제 렌더링과 동일한 높이/레이아웃 유지
  - `Skeleton` 컴포넌트 사용 (`@/components/ui/skeleton`)
  - 프로젝트 패턴 따름 (`stats/page.tsx` 참고)

### Phase 1.2: Suspense 적용

- [ ] **T1.2.1** [Phase 1] `apps/web/src/app/trades/page.tsx`: `TradesContent` 컴포넌트 분리
  - 데이터 fetch 로직을 별도 컴포넌트로 분리
  - `async function TradesContent({ status }: { status: TradeStatus })`

- [ ] **T1.2.2** [Phase 1] `apps/web/src/app/trades/page.tsx`: Suspense로 감싸기
  - `Suspense` import 추가
  - `TradesContent`를 Suspense로 감싸기
  - `fallback={<TradesSkeleton />}` 설정

---

## Phase 2: 쿼리 최적화

### Phase 2.1: 테스트 코드 작성 (TDD)

- [ ] **T2.1.1** [P] [Phase 2] `apps/web/src/lib/trades/__tests__/queries-performance.test.ts`: 쿼리 최적화 테스트 작성
  - 윈도우 함수를 사용한 가격 조회 테스트
  - 최신 가격과 전일 가격이 올바르게 조회되는지 확인
  - 전일대비 변동률 계산 테스트

### Phase 2.2: 쿼리 최적화 구현

- [ ] **T2.2.1** [Phase 2] `apps/web/src/lib/trades/queries.ts`: 가격 조회 로직 최적화
  - 기존 2번의 쿼리를 1번의 쿼리로 통합
  - 윈도우 함수(`ROW_NUMBER()`) 사용
  - 중첩 서브쿼리 제거

- [ ] **T2.2.2** [Phase 2] `apps/web/src/lib/trades/queries.ts`: 결과 파싱 로직 수정
  - 최적화된 쿼리 결과를 파싱하여 기존 로직과 동일한 형태로 변환
  - `priceBySymbol`, `prevPriceBySymbol`, `priceChangeBySymbol` Map 생성

---

## Phase 3: 테스트 및 검증

### Phase 3.1: 단위 테스트

- [ ] **T3.1.1** [Phase 3] `apps/web/src/lib/trades/__tests__/queries-performance.test.ts`: 테스트 실행 및 통과 확인

### Phase 3.2: 통합 테스트

- [ ] **T3.2.1** [Phase 3] 수동 테스트: Suspense가 올바르게 작동하는지 확인
  - 페이지 접속 시 로딩 스켈레톤 표시 확인
  - 데이터 로드 후 정상 렌더링 확인

- [ ] **T3.2.2** [Phase 3] 수동 테스트: 최적화된 쿼리가 올바른 데이터를 반환하는지 확인
  - 최신 가격이 올바르게 표시되는지 확인
  - 전일대비 변동률이 올바르게 계산되는지 확인

### Phase 3.3: 성능 테스트

- [ ] **T3.3.1** [Phase 3] 쿼리 실행 시간 측정
  - Before: 기존 쿼리 실행 시간
  - After: 최적화된 쿼리 실행 시간
  - 성능 개선 확인

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

- [ ] **T5.1.1** [Phase 5] `README.md`: 성능 개선 내용 추가 (필요 시)

