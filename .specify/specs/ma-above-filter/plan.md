# 이평선 위 필터 구현 계획

## Phase 1: 데이터 레이어 (Backend)

### 1.1 타입 정의

- [x] `ScreenerParams` 타입에 `ma20Above`, `ma50Above`, `ma100Above`, `ma200Above` 필드 추가
- [x] `FilterState` 타입에 동일한 필드 추가

### 1.2 쿼리 빌더 수정

- [x] `buildWhereFilters` 함수에 이평선 위 필터 조건 추가
- [x] `buildCurrentDataCTE`에서 이미 MA 데이터를 가져오고 있으므로 추가 조인 불필요
- [x] NULL 체크 로직 확인 (MA 데이터가 없는 경우 처리) - `IS NOT NULL` 체크 포함
- [x] `buildScreenerQuery`에서 `requireMA` 계산 시 새 필터 포함

### 1.3 API 라우트 수정

- [x] `parseRequestParams` 함수에서 새 필터 파라미터 파싱 추가
- [x] 기본값은 모두 `false`

## Phase 2: 상태 관리 (Frontend)

### 2.1 필터 스키마 확장

- [x] `filterSchema`에 새 필드 추가 (Zod boolean)
- [x] `filterDefaults`에 기본값 추가
- [x] `buildQueryParams` 및 `buildCacheTag`에 새 필터 포함

### 2.2 useFilterState 훅 확장

- [x] `ma20Above`, `setMa20Above` 추가
- [x] `ma50Above`, `setMa50Above` 추가
- [x] `ma100Above`, `setMa100Above` 추가
- [x] `ma200Above`, `setMa200Above` 추가
- [x] 모두 `parseAsBoolean.withDefault(false)` 사용

### 2.3 useFilterActions 훅 수정

- [x] `handleFilterApply`에서 새 필터 상태 반영
- [x] `handleFilterReset`에서 새 필터 초기화 (`false`로 초기화)
- [x] `handleFilterChange`에 새 필터 파라미터 추가

## Phase 3: UI 구현

### 3.1 필터 다이얼로그 UI

- [x] `CategoryFilterDialog`에 "이평선 위" 섹션 추가
- [x] 체크박스 4개 추가 (20MA/50MA/100MA/200MA) - 가로 배치
- [x] 각 체크박스는 독립적으로 동작
- [x] DRY 원칙 준수: `map`으로 반복 패턴 처리

### 3.2 필터 요약

- [x] `getMAFilterSummary` 함수에 이평선 필터 요약 로직 추가
- [x] 활성화된 필터만 텍스트로 표시
- [x] 예: "20MA, 50MA" 형식으로 표시

### 3.3 필터박스 표시

- [x] `ScreenerClient`에서 새 필터 상태를 `currentFilterState`에 포함

## Phase 4: 테스트 및 검증

### 4.1 기능 테스트

- [x] 단일 필터 테스트 - 코드 검증 완료
- [x] 다중 필터 테스트 (AND 조건) - 코드 검증 완료
- [x] 필터 해제 테스트 - `handleFilterReset` 수정 완료
- [x] URL 쿼리 파라미터 테스트 - `parseRequestParams` 확인 완료

### 4.2 엣지 케이스

- [x] MA 데이터가 NULL인 종목 처리 확인 - SQL 쿼리에서 `IS NOT NULL` 체크 포함
- [x] 필터 상태 유지 확인 (새로고침) - `useQueryState`로 URL 동기화 확인
- [x] 필터 초기화 확인 - `handleFilterReset`에서 `false`로 초기화 확인

## Phase 5: UX 개선

### 5.1 종목 테이블 개선

- [x] 심볼 클릭 시 상세 페이지가 새 탭에서 열리도록 수정
- [x] `target="_blank"` 및 `rel="noopener noreferrer"` 추가 (보안)

## 구현 순서

1. Phase 1: 데이터 레이어 (타입 정의 → 쿼리 빌더 → API)
2. Phase 2: 상태 관리 (스키마 → 훅 → 액션)
3. Phase 3: UI 구현 (다이얼로그 → 요약 → 필터박스)
4. Phase 4: 테스트 및 검증
5. Phase 5: UX 개선 (종목 테이블 새 탭 열기)
