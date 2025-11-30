# 이평선 필터 버그 수정 및 성능 최적화

## 목표

- 이평선 필터가 URL 파라미터에 명시적으로 값이 있어야만 적용되도록 수정
- 5000개 데이터 증가에 따른 성능 최적화 (필터 모달, 테이블 렌더링)

## 문제 상황

### 버그 1: 이평선 필터가 기본값으로 적용됨

- **현상**: `localhost:3000`으로 접속 시 URL 파라미터가 없어도 `ordered`와 `goldenCross` 필터가 적용됨
- **원인**:
  - `filterDefaults`에서 `ordered: true`, `goldenCross: true`로 설정
  - `useFilterState`에서 `.withDefault()` 사용으로 URL 파라미터가 없을 때 기본값 적용
  - `parseFilters`에서 URL 파라미터가 없을 때 기본값 사용
  - `buildQueryParams`에서 모든 필터를 쿼리 파라미터에 포함

### 버그 2: 필터 모달과 프리뷰 상태 불일치

- **현상**: 필터 프리뷰는 "이평선 필터 없음"인데 모달을 열면 `ordered`와 `goldenCross`가 체크되어 있음
- **원인**: `CategoryFilterDialog`에서 `filterState.ordered ?? true`로 기본값을 `true`로 설정

### 버그 3: 필터를 모두 끄면 정배열이 아닌 티커가 표시되지 않음

- **현상**: 필터를 모두 끄면 정배열이 아닌 티커(예: TSLA)가 테이블에 표시되지 않음
- **원인**:
  - `requireMA = false`일 때 `daily_ma` 테이블을 사용하여 MA 데이터가 없는 심볼 제외
  - `buildCandidatesCTE`에서 `JOIN symbols`로 인해 `symbols` 테이블에 없는 심볼 제외
  - `prev_ma`와 `prev_status` CTE가 불필요하게 포함되어 필터링

### 성능 문제: 5000개 데이터로 인한 느린 렌더링

- **현상**:
  - 필터 모달이 열릴 때 한참 걸림
  - 테이블 렌더링이 매우 느림 (5000개 행을 모두 렌더링)
- **원인**:
  - 5000개 행을 모두 렌더링하여 초기 로딩이 매우 느림
  - 필터 모달에서 불필요한 재계산
  - 테이블 행 컴포넌트가 메모이제이션되지 않음
  - 포트폴리오 상태를 5000번 호출
  - 차트 데이터가 매번 재계산됨
  - 섹터 포맷팅이 매번 호출됨

## 해결 방안

### 버그 수정

#### 1. 이평선 필터 기본값 제거

- `filterDefaults`에서 `ordered`와 `goldenCross`를 `false`로 변경
- `useFilterState`에서 `.withDefault()` 제거하여 URL 파라미터가 없을 때 `null` 유지
- `parseFilters`에서 URL 파라미터가 없을 때 MA 필터를 `false`로 설정
- `buildQueryParams`에서 `true`인 필터만 쿼리 파라미터에 포함

#### 2. 필터 모달 초기값 수정

- `CategoryFilterDialog`에서 `filterState.ordered ?? false`로 변경
- `handleReset`에서 `ordered`와 `goldenCross`를 `false`로 설정

#### 3. SQL 쿼리 수정

- `requireMA = false`일 때 `daily_prices`에서 각 심볼의 최신 데이터를 가져오도록 수정
- `daily_ma`를 `LEFT JOIN`하여 MA 데이터가 있어도 없어도 모든 티커 포함
- `buildCandidatesCTE`에서 `LEFT JOIN symbols`로 변경하여 `symbols` 테이블에 없는 심볼도 포함
- `prev_ma`와 `prev_status` CTE를 `justTurned && ordered === true`일 때만 포함
- 쿼리에서 `ordered` 정보를 계산하여 반환

#### 4. API 응답 수정

- `transformResults`에서 하드코딩된 `ordered: true` 제거
- 쿼리 결과의 실제 `ordered` 값 사용

### 성능 최적화

#### 1. 필터 모달 최적화

- `initialTempState` 계산을 `open`이 `true`일 때만 수행
- `useEffect` 의존성 배열 최적화

#### 2. 테이블 렌더링 최적화

- **무한 스크롤 구현**: 초기 100개만 렌더링, 스크롤 시 50개씩 추가 로드
- `StockTableRow` 컴포넌트를 `React.memo`로 메모이제이션
- 포트폴리오 상태를 `Map`으로 한 번만 계산 (5000번 호출 방지)
- 차트 데이터(`revenueChartData`, `epsChartData`)를 `useMemo`로 메모이제이션
- `QuarterlyBarChart` 컴포넌트를 `React.memo`로 메모이제이션
- 섹터 포맷팅(`formatSector`)을 `useMemo`로 메모이제이션
- 콜백 함수(`handleSort`, `handleTogglePortfolio`)를 `useCallback`으로 메모이제이션

## 변경 파일

### 버그 수정

- `apps/web/src/lib/filters/schema.ts`: 필터 기본값 및 쿼리 파라미터 빌드 로직 수정
- `apps/web/src/hooks/useFilterState.ts`: `.withDefault()` 제거
- `apps/web/src/components/filters/CategoryFilterDialog.tsx`: 초기값 및 리셋 로직 수정
- `apps/web/src/lib/screener/query-builder.ts`: SQL 쿼리 로직 수정
- `apps/web/src/app/api/screener/stocks/route.ts`: 파라미터 파싱 및 결과 변환 수정
- `apps/web/src/types/screener.ts`: `ScreenerQueryResult`에 `ordered` 필드 추가
- `apps/web/src/app/(screener)/ScreenerClient.tsx`: 타입 에러 수정
- `apps/web/src/hooks/useFilterActions.ts`: 타입 에러 수정

### 성능 최적화

- `apps/web/src/components/filters/CategoryFilterDialog.tsx`: 모달 최적화
- `apps/web/src/components/screener/StockTable.tsx`:
  - 무한 스크롤 구현
  - 행 컴포넌트 메모이제이션
  - 포트폴리오 상태 Map 최적화
  - 차트 데이터 메모이제이션
  - 섹터 포맷팅 메모이제이션
  - 콜백 메모이제이션
- `apps/web/src/components/charts/QuarterlyBarChart.tsx`: 컴포넌트 메모이제이션

## 테스트 시나리오

### 버그 수정 검증

1. **이평선 필터 기본값 제거**

   - `localhost:3000`으로 접속
   - URL 파라미터 확인: `ordered`와 `goldenCross`가 없어야 함
   - API 요청 확인: 쿼리 파라미터에 `ordered`와 `goldenCross`가 없어야 함
   - 테이블 확인: 모든 티커(정배열/비정배열 모두)가 표시되어야 함

2. **필터 모달 상태 일치**

   - 필터를 모두 끈 상태에서 모달 열기
   - `ordered`와 `goldenCross` 체크박스가 해제되어 있어야 함
   - 필터 프리뷰와 모달 상태가 일치해야 함

3. **정배열이 아닌 티커 표시**
   - 필터를 모두 끈 상태
   - TSLA 같은 정배열이 아닌 티커가 테이블에 표시되어야 함
   - API 응답에서 `ordered: false`인 티커가 포함되어야 함

### 성능 검증

1. **필터 모달 성능**

   - 필터 모달 열기 시간 측정: 1초 이내
   - 모달 열기 시 불필요한 재계산이 없어야 함

2. **테이블 렌더링 성능**
   - 초기 렌더링: 100개만 렌더링하여 빠른 로딩
   - 스크롤 시 부드러운 추가 로딩 (50개씩)
   - 행 컴포넌트가 불필요하게 리렌더링되지 않아야 함
   - 포트폴리오 상태가 한 번만 계산되어야 함
   - 차트 데이터가 불필요하게 재계산되지 않아야 함

## 수락 기준

### 버그 수정

- [ ] `localhost:3000`으로 접속 시 URL 파라미터에 `ordered`와 `goldenCross`가 없음
- [ ] 필터를 모두 끈 상태에서 모든 티커(정배열/비정배열)가 표시됨
- [ ] 필터 모달의 체크박스 상태가 필터 프리뷰와 일치함
- [ ] API 응답에서 `ordered` 정보가 정확하게 반환됨

### 성능 최적화

- [ ] 필터 모달이 1초 이내에 열림
- [ ] 초기 테이블 렌더링이 100개만 표시되어 빠르게 로드됨
- [ ] 스크롤 시 50개씩 추가 로딩이 부드럽게 작동함
- [ ] 포트폴리오 상태가 한 번만 계산됨 (5000번 호출 방지)
- [ ] 차트 데이터가 불필요하게 재계산되지 않음
- [ ] 행 컴포넌트가 불필요하게 리렌더링되지 않음

## 참고사항

- 이 변경사항은 필터 퍼시스턴트 피쳐와 독립적으로 동작해야 함
- 기존 필터 퍼시스턴트 기능은 유지되어야 함
- URL 파라미터 기반 필터링은 기존과 동일하게 동작해야 함
