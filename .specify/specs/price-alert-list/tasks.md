# Tasks: 가격 알림 목록 페이지

**Input**: Design documents from `/specs/price-alert-list/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: API 테스트 및 통합 테스트 포함

**Organization**: 사용자 스토리별로 그룹화하여 독립적 구현 및 테스트 가능

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 사용자 스토리 (US1, US2, US3)
- 파일 경로를 설명에 포함

## Path Conventions

- **Next.js 프로젝트**: `src/` at repository root
- **API**: `src/app/api/`
- **UI**: `src/app/alerts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 프로젝트 초기화 및 기본 구조

- [x] T001 브랜치 생성: `feature/price-alert-list`
- [x] T002 [P] 기존 프로젝트 구조 확인 및 백업

---

## Phase 2: User Story 1 - 알림 목록 조회 및 표시 (Priority: P1) 🎯 MVP

**Goal**: 돌파 감지 알림을 받은 종목들을 웹 페이지에서 조회할 수 있는 기능 제공

**Independent Test**: `/alerts` 페이지 접속 시 날짜별로 그룹화된 알림 목록이 표시되고, 필터링이 정상 작동하는지 확인

### Tests for User Story 1

> **NOTE: 구현 전에 테스트를 먼저 작성하고 실패하는지 확인**

- [x] T003 [P] [US1] API 엔드포인트 테스트 작성: `src/app/api/alerts/__tests__/route.test.ts`
- [x] T004 [P] [US1] 컴포넌트 테스트 작성: `src/components/alerts/__tests__/AlertsClient.test.tsx`, `src/components/alerts/__tests__/AlertTableGroup.test.tsx`

### Implementation for User Story 1

- [x] T005 [US1] 알림 타입 상수 및 라벨 정의: `src/lib/alerts/constants.ts`
  - 알림 타입과 사용자 친화적인 라벨 매핑

- [x] T006 [US1] API 엔드포인트 기본 구조 구현: `src/app/api/alerts/route.ts`
  - 쿼리 파라미터: `alertType`, `maxDates`

- [x] T007 [US1] 날짜별 알림 조회 로직 구현: `src/app/api/alerts/route.ts`
  - 인덱스 활용하여 빠른 조회

- [x] T008 [US1] ScreenerCompany 변환 로직 구현: `src/app/api/alerts/route.ts`
  - 복잡한 조인 쿼리로 모든 필요한 데이터 조회
  - 스크리너 API의 쿼리 패턴 참고

- [x] T009 [US1] API 응답 타입 정의: `src/app/api/alerts/route.ts`
  - 타입 안전성 보장

- [x] T010 [US1] 페이지 컴포넌트 기본 구조: `src/app/alerts/page.tsx`
  - 서버 컴포넌트로 메타데이터 및 Suspense 처리
  - PageHeader에 뒤로가기 링크 포함

- [x] T011 [US1] AlertsClient 컴포넌트 구현: `src/components/alerts/AlertsClient.tsx`
  - 알림 타입 필터 상태 관리 (`useState`)
  - React Query (`useSuspenseQuery`)로 데이터 페칭
  - FilterTabs로 알림 타입 선택
  - 각 날짜별로 Card로 감싸서 AlertTableGroup 렌더링
  - 빈 상태/에러 상태 처리 (`StateMessage` 컴포넌트)

- [x] T012 [US1] AlertTableGroup 컴포넌트 구현: `src/components/alerts/AlertTableGroup.tsx`
  - 날짜별로 div로 구분하여 표시 (Card는 AlertsClient에서 감쌈)
  - 날짜 헤더에 요일 표시 (`formatDateWithWeekday` 내부 함수)
  - StockTable 컴포넌트 재사용 (filterState, totalCount props 전달)

- [x] T013 [US1] 네비게이션 바에 알림 링크 추가: `src/components/navigation.tsx`
  - 페이지 접근성 개선

- [x] T014 [US1] 기준일 표시 제거: `src/components/alerts/AlertTableGroup.tsx`
  - StockTable에서 `tradeDate` prop 제거
  - 필터로 이미 알림 타입이 선택되어 있으므로 불필요

- [x] T015 [US1] 상단 마진 최적화: `src/app/alerts/page.tsx`, `src/components/alerts/AlertsClient.tsx`, `src/components/alerts/AlertTableGroup.tsx`
  - `py-6` → `py-3`, `pt-6` → `pt-4`, `space-y-8` → `space-y-4` 등 조정

- [x] T016 [US1] 날짜 헤더에서 중복 알림 타입 배지 제거: `src/components/alerts/AlertTableGroup.tsx`
  - 필터로 이미 선택된 알림 타입이 표시되므로 중복 제거

**Checkpoint**: 이 시점에서 User Story 1이 완전히 기능하고 독립적으로 테스트 가능해야 함

## 비기능 요구사항

### 성능
- ✅ 인덱스 활용: `idx_price_alerts_type_date` 인덱스로 빠른 조회
- ✅ 날짜별 제한: 최대 5거래일치만 조회
- ✅ API 캐싱: Next.js 캐시 헤더 활용

### 에러 처리
- ✅ 데이터 없음: 빈 상태 UI 표시
- ✅ API 에러: 에러 메시지 표시
- ✅ 날짜 파싱 에러: 기본값으로 폴백

### 접근성
- ✅ 네비게이션 링크: 메인 네비게이션에서 접근 가능
- ✅ 필터 UI: 명확한 탭으로 선택 상태 표시
- ✅ 날짜 표시: 요일 포함하여 명확히 표시

## 환경 변수 체크리스트

없음 (기존 환경 변수만 사용)

## 수락 기준

### API 테스트
- [x] 최신 날짜부터 최대 5거래일치 알림 반환
- [x] 날짜별로 그룹화되어 반환되는지 확인
- [x] 알림 데이터가 ScreenerCompany 형태로 변환되는지 확인
- [x] 알림 없을 때 빈 배열 반환
- [x] 알림 타입별 필터링 동작 확인

### UI 테스트
- [x] 날짜별로 테이블이 세로로 배치되는지 확인
- [x] 각 날짜별 테이블이 스크리너 테이블과 동일하게 표시되는지 확인
- [x] 날짜 헤더가 올바르게 표시되는지 확인
- [x] 컬럼 정렬 동작 확인 (스크리너 테이블과 동일)
- [x] 티커 클릭 시 종목 상세 페이지 이동
- [x] 빈 상태 UI 표시 확인
- [x] 로딩 상태 스켈레톤 표시 확인
- [x] 알림 타입 필터 동작 확인
- [x] 날짜별 Card 구분 확인
- [x] 네비게이션 링크 동작 확인

### 통합 테스트
- [x] 실제 데이터로 전체 플로우 테스트
- [x] 날짜별 그룹화 동작 확인
- [x] 스크리너 테이블과 동일한 기능 동작 확인
- [x] 알림 타입 필터링 동작 확인

