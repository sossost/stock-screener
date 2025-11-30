# 이평선 위 필터 작업 목록

## Phase 1: 데이터 레이어

### 타입 정의

- [x] `apps/web/src/types/screener.ts`: `ScreenerParams`에 `ma20Above`, `ma50Above`, `ma100Above`, `ma200Above` 추가
- [x] `apps/web/src/lib/filters/summary.ts`: `FilterState` 인터페이스에 동일한 필드 추가

### 쿼리 빌더

- [x] `apps/web/src/lib/screener/query-builder.ts`: `buildWhereFilters` 함수에 이평선 위 필터 조건 추가
  - `ma20Above` → `AND cand.close > cand.ma20`
  - `ma50Above` → `AND cand.close > cand.ma50`
  - `ma100Above` → `AND cand.close > cand.ma100`
  - `ma200Above` → `AND cand.close > cand.ma200`
- [x] `buildScreenerQuery`에서 `requireMA` 계산 시 새 필터 포함

### API 라우트

- [x] `apps/web/src/app/api/screener/stocks/route.ts`: `parseRequestParams` 함수에서 새 필터 파라미터 파싱 추가

## Phase 2: 상태 관리

### 필터 스키마

- [x] `apps/web/src/lib/filters/schema.ts`: `filterSchema`에 새 필드 추가
- [x] `apps/web/src/lib/filters/schema.ts`: `filterDefaults`에 기본값 추가
- [x] `buildQueryParams` 및 `buildCacheTag`에 새 필터 포함

### 필터 상태 훅

- [x] `apps/web/src/hooks/useFilterState.ts`: `ma20Above`, `setMa20Above` 추가
- [x] `apps/web/src/hooks/useFilterState.ts`: `ma50Above`, `setMa50Above` 추가
- [x] `apps/web/src/hooks/useFilterState.ts`: `ma100Above`, `setMa100Above` 추가
- [x] `apps/web/src/hooks/useFilterState.ts`: `ma200Above`, `setMa200Above` 추가

### 필터 액션

- [x] `apps/web/src/hooks/useFilterActions.ts`: `handleFilterApply`에서 새 필터 상태 반영
- [x] `apps/web/src/hooks/useFilterActions.ts`: `handleFilterReset`에서 새 필터 초기화
- [x] `handleFilterChange`에 새 필터 파라미터 추가

## Phase 3: UI 구현

### 필터 다이얼로그

- [x] `apps/web/src/components/filters/CategoryFilterDialog.tsx`: "이평선 위" 섹션 추가
- [x] 체크박스 4개 추가 (20MA/50MA/100MA/200MA) - 가로 배치
- [x] 각 체크박스 상태 관리 로직 추가

### 필터 요약

- [x] `apps/web/src/lib/filters/summary.ts`: `getMAFilterSummary` 함수에 이평선 필터 요약 로직 추가
- [x] 활성화된 필터만 텍스트로 표시 (예: "20MA, 50MA")

### ScreenerClient 통합

- [x] `apps/web/src/app/(screener)/ScreenerClient.tsx`: 새 필터 상태를 `currentFilterState`에 포함

## Phase 4: 테스트

### 기능 테스트

- [x] 단일 필터 테스트 (20일선 위만) - 코드 검증 완료
- [x] 다중 필터 테스트 (20일선 위 + 50일선 위) - 코드 검증 완료
- [x] 모든 필터 테스트 (4개 모두) - 코드 검증 완료
- [x] 필터 해제 테스트 - `handleFilterReset` 수정 완료

### 엣지 케이스

- [x] MA 데이터가 NULL인 종목 처리 확인 - SQL 쿼리에서 `IS NOT NULL` 체크 포함
- [x] URL 쿼리 파라미터 정상 작동 확인 - `parseRequestParams`에서 파싱 로직 확인
- [x] 페이지 새로고침 시 필터 상태 유지 확인 - `useQueryState`로 URL 동기화 확인

### 코드 검증 결과

- ✅ NULL 처리: `cand.close IS NOT NULL AND cand.ma20 IS NOT NULL` 체크 포함
- ✅ URL 파라미터 파싱: `searchParams.get("ma20Above") === "true"` 로직 확인
- ✅ 필터 상태 관리: `useQueryState`로 URL과 동기화되어 새로고침 시 상태 유지
- ✅ 필터 초기화: `handleFilterReset`에서 이평선 위 필터도 `false`로 초기화
- ✅ `requireMA` 계산: 새 필터 포함하여 MA 데이터 조회 여부 결정
- ✅ 필터 요약: `getMAFilterSummary`에서 활성화된 필터만 표시

## Phase 5: UX 개선

### 종목 테이블 개선

- [x] `apps/web/src/components/screener/StockTable.tsx`: 심볼 클릭 시 상세 페이지가 새 탭에서 열리도록 수정 (`target="_blank"`, `rel="noopener noreferrer"` 추가)
