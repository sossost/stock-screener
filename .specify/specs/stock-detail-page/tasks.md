# Tasks: 종목 상세 페이지

**Input**: Design documents from `/specs/stock-detail-page/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: User Story별로 필요한 테스트를 포함한다(새 파일 생성 가능).  
**Organization**: Tasks are grouped by phase and user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: 기본 상세 페이지 (MVP) 🎯

### Setup

- [ ] T001 브랜치 생성: `feature/stock-detail-page`
- [ ] T002 [P] 기존 데이터 구조 확인: `apps/web/src/db/schema.ts` (symbols, dailyPrices, dailyMa)
- [ ] T003 [P] 기존 스크리너 타입/유틸 확인: `apps/web/src/types/golden-cross.ts`, `apps/web/src/utils/format.ts`

---

### User Story 1 - 종목 상세 페이지 접근 (Priority: P1)

**Goal**: 스크리너 테이블에서 티커 클릭 시 `/stock/[symbol]` 페이지로 이동  
**Independent Test**: 티커 클릭 → 올바른 URL 라우팅, 페이지 정상 렌더링

#### Tests

- [ ] T010 [P] [US1] 상세 페이지 라우트 테스트: `apps/web/src/app/stock/[symbol]/__tests__/page.test.tsx` (신규)

#### Implementation

- [ ] T011 [US1] 동적 라우트 생성: `apps/web/src/app/stock/[symbol]/page.tsx`
- [ ] T012 [US1] 로딩 스켈레톤: `apps/web/src/app/stock/[symbol]/loading.tsx`
- [ ] T013 [US1] 404 페이지: `apps/web/src/app/stock/[symbol]/not-found.tsx`
- [ ] T014 [US1] 스크리너 테이블 티커 링크 변경: `apps/web/src/components/screener/StockTable.tsx`

**Checkpoint**: 스크리너에서 티커 클릭 시 상세 페이지로 이동

---

### User Story 2 - 기본 정보 표시 (Priority: P1)

**Goal**: 회사명, 섹터, 산업, 거래소, 시가총액 표시  
**Independent Test**: API 응답에 기본 정보 포함, UI에 올바르게 표시

#### Tests

- [ ] T020 [P] [US2] 종목 상세 API 테스트: `apps/web/src/app/api/stock/[symbol]/__tests__/route.test.ts` (신규)

#### Implementation

- [ ] T021 [US2] 상세 페이지 타입 정의: `apps/web/src/types/stock-detail.ts` (신규)
- [ ] T022 [US2] 종목 상세 API 엔드포인트: `apps/web/src/app/api/stock/[symbol]/route.ts` (신규)
- [ ] T023 [US2] 헤더 컴포넌트 (티커, 회사명, 섹터): `apps/web/src/components/stock-detail/StockHeader.tsx` (신규)
- [ ] T024 [US2] 클라이언트 컴포넌트: `apps/web/src/app/stock/[symbol]/StockDetailClient.tsx` (신규)

**Checkpoint**: 상세 페이지에 기본 정보가 표시됨

---

### User Story 3 - 가격 및 이평선 상태 표시 (Priority: P1)

**Goal**: 현재가, RS Score, 이동평균선, 정배열/골든크로스 상태 표시  
**Independent Test**: dailyPrices, dailyMa 데이터 조회 및 MA 상태 계산 정확성

#### Tests

- [ ] T030 [P] [US3] MA 상태 계산 로직 테스트: `apps/web/src/lib/__tests__/ma-status.test.ts` (신규)

#### Implementation

- [ ] T031 [US3] MA 상태 계산 유틸: `apps/web/src/lib/ma-status.ts` (신규)
- [ ] T032 [US3] 가격 카드 컴포넌트: `apps/web/src/components/stock-detail/PriceCard.tsx` (신규)
- [ ] T033 [US3] MA 상태 뱃지 컴포넌트: `apps/web/src/components/stock-detail/MAStatusBadge.tsx` (신규)
- [ ] T034 [US3] API에 가격/MA 데이터 추가: `apps/web/src/app/api/stock/[symbol]/route.ts`

**Checkpoint**: 가격 정보와 정배열/골든크로스 뱃지가 표시됨

---

### User Story 4 - 포트폴리오 추가/제거 (Priority: P1)

**Goal**: 상세 페이지에서 포트폴리오 토글 기능  
**Independent Test**: 버튼 클릭 시 상태 토글, 새로고침 후 유지

#### Implementation

- [ ] T040 [US4] 헤더에 포트폴리오 버튼 추가 (기존 usePortfolio 훅 재사용): `apps/web/src/components/stock-detail/StockHeader.tsx`

**Checkpoint**: 포트폴리오 버튼이 정상 동작함

---

### Phase 1 마무리

- [ ] T050 `yarn test` 실행 및 결과 확인
- [ ] T051 `yarn lint` 실행 및 수정
- [ ] T052 모바일 반응형 레이아웃 확인
- [ ] T053 다양한 종목(데이터 있음/없음, ETF 등) 테스트

**Phase 1 완료 조건**: 스크리너 → 상세 페이지 이동, 기본 정보/가격/MA 상태/포트폴리오 버튼 정상 동작

---

## Phase 2: 밸류에이션 & 수익성 지표

### User Story 5 - 밸류에이션 지표 표시 (Priority: P2)

**Goal**: P/E, PEG, P/S, P/B, EV/EBITDA 표시  
**Independent Test**: dailyRatios/quarterlyRatios 데이터 조회 및 포맷 정확성

#### Implementation

- [x] T060 [US5] API에 dailyRatios/quarterlyRatios 데이터 추가: `apps/web/src/lib/stock-detail.ts`
- [x] T061 [US5] 밸류에이션 카드 컴포넌트: `apps/web/src/components/stock-detail/FundamentalsSection.tsx` (ValuationCard)
- [x] T062 [US5] 타입 확장 (ratio 필드, valuationDate, quarterlyPeriodEndDate 추가): `apps/web/src/types/stock-detail.ts`

---

### User Story 6 - 수익성 지표 표시 (Priority: P2)

**Goal**: 마진율, 배당 정보 표시

#### Implementation

- [x] T070 [US6] 분기 재무 카드 컴포넌트 (수익성/레버리지/배당): `apps/web/src/components/stock-detail/FundamentalsSection.tsx` (QuarterlyFinancialsCard)
- [x] T071 [US6] 레이아웃 통합 (PriceCard, ValuationCard, QuarterlyFinancialsCard): `apps/web/src/app/stock/[symbol]/StockDetailClient.tsx`

---

### Phase 2 마무리

- [x] T080 `yarn test` 실행 및 결과 확인
- [x] T081 null 값 처리 확인 ("-" 표시)
- [x] T082 음수 P/E 등 엣지케이스 확인
- [x] T083 테스트 작성: `apps/web/src/lib/__tests__/stock-detail.test.ts` (신규)

**Phase 2 완료 조건**: 밸류에이션/수익성/재무 건전성 지표가 정상 표시됨 ✅

---

## Phase 3: 분기별 실적 차트

### User Story 7 - 분기별 실적 차트 (Priority: P3)

**Goal**: 매출, 순이익, EPS 추이 차트 (최근 8분기)  
**Independent Test**: quarterlyFinancials 히스토리 조회, 차트 렌더링

#### Implementation

- [x] T090 [US7] lib/stock-detail.ts에 분기별 재무 히스토리 추가 (최근 8분기)
- [x] T091 [US7] 분기별 차트 컴포넌트: `apps/web/src/components/stock-detail/QuarterlyCharts.tsx` (신규)
- [x] T092 [US7] 탭으로 매출/순이익/EPS 전환 UI

---

### Phase 3 마무리

- [x] T100 차트 렌더링 확인 (데이터 8개 미만인 경우 포함)
- [x] T101 lint/test 통과

**Phase 3 완료 조건**: 분기별 매출/순이익/EPS 차트가 대형으로 표시됨 ✅

---

## Phase 4: 주가 차트 & 기술적 지표

### User Story 8 - 주가 히스토리 차트 (Priority: P4)

**Goal**: 캔들스틱 차트 + 이동평균선 + RSI/MACD 보조지표  
**Independent Test**: dailyPrices 히스토리 조회, 차트 렌더링, 기간 필터

#### Setup

- [x] T110 [US8] `lightweight-charts` 라이브러리 설치: `yarn workspace web add lightweight-charts`
- [x] T111 [US8] 기술적 지표 계산 유틸 생성: `apps/web/src/lib/technical-indicators.ts` (RSI, MACD, EMA, SMA 계산)

#### Tests

- [x] T112 [P] [US8] 기술적 지표 계산 테스트: `apps/web/src/lib/__tests__/technical-indicators.test.ts`

#### Implementation

- [x] T113 [US8] 주가 차트 API (기간별 필터): `apps/web/src/app/api/stock/[symbol]/prices/route.ts`
- [x] T114 [US8] 캔들스틱 차트: `TechnicalChart.tsx` 내 구현
- [x] T115 [US8] 이동평균선 오버레이: SMA 20/50/100/200 (색상: 초록/주황/분홍/하늘) - 클라이언트 계산
- [x] T116 [US8] 거래량 바 차트: 하단 볼륨 히스토그램
- [x] T117 [US8] RSI 패널: 14일 RSI, 70/30 기준선 (배경 흰색, 글자색 통일)
- [x] T118 [US8] MACD 패널: MACD(12,26,9), Signal Line, 히스토그램
- [x] T119 [US8] 기간: 1Y 고정 (데이터 부족으로 기간 선택 제외)
- [x] T120 [US8] 차트 통합 컴포넌트: `apps/web/src/components/stock-detail/TechnicalChart.tsx`
- [x] T121 [US8] 호버 시 OHLC, 변동, 거래량, MA 값 표시 (왼쪽 상단 정보 패널)
- [x] T122 [US8] RSI/MACD 현재값 레이블에 표시

---

### User Story 9 - 동종업계 비교 (Priority: P5 - 추후 고도화)

**Goal**: 같은 섹터 종목과 주요 지표 비교  
**Status**: 추후 고도화로 연기

#### Implementation (추후)

- [ ] T130 [US9] 동종업계 비교 API: `apps/web/src/app/api/stock/[symbol]/peers/route.ts`
- [ ] T131 [US9] 비교 테이블 컴포넌트: `apps/web/src/components/stock-detail/PeerComparison.tsx`

---

### Phase 4 마무리

- [x] T140 주가 차트 성능 확인 (대량 데이터 - 1년치)
- [ ] T141 RSI/MACD 계산 정확성 확인 (외부 사이트와 비교) - 추후 검증
- [ ] T142 모바일 반응형 차트 확인 - 추후 검증
- [x] T144 `yarn test` 전체 실행 (94 tests passed)
- [x] T145 `yarn lint` 통과
- [x] T146 `yarn build` 성공

**Phase 4 완료 조건**: 캔들스틱 차트 + RSI/MACD 보조지표 정상 동작 ✅

---

## 전체 마무리

- [ ] T140 `yarn test` 전체 실행
- [ ] T141 `yarn build` 성공 확인
- [ ] T142 문서 업데이트 (README, spec.md 반영)
- [ ] T143 PR 생성 및 코드 리뷰
