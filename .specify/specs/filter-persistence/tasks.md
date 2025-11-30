# 필터 값 자동 저장 기능 작업 목록

## Phase 1: localStorage 유틸리티 구현 ✅

### 필터 저장/로드 함수

- [x] `apps/web/src/utils/filter-storage.ts` 파일 생성
- [x] `saveDefaultFilters(filterState: FilterState): void` 함수 구현
  - FilterState를 JSON.stringify로 변환
  - localStorage.setItem으로 저장
  - try-catch로 에러 처리
- [x] `loadDefaultFilters(): Partial<FilterState> | null` 함수 구현
  - localStorage.getItem으로 읽기
  - JSON.parse로 파싱
  - 파싱 실패 시 null 반환 및 localStorage.removeItem
  - 타입 안전성 확보
- [x] `clearDefaultFilters(): void` 함수 구현
  - localStorage.removeItem으로 삭제
- [x] 타입 정의 및 에러 처리 완료

### 필터 병합 로직

- [x] `mergeFilters(defaultFilters: Partial<FilterState>, urlFilters: Partial<FilterState>): FilterState` 함수 구현
- [x] URL 파라미터 우선순위 적용: `{ ...defaultFilters, ...urlFilters }`
- [x] `filterDefaults`와 병합하여 완전한 FilterState 생성
- [x] 타입 안전성 확보

## Phase 2: 클라이언트 사이드 렌더링으로 변경 및 초기 필터 로드 ✅

### 서버 사이드 → 클라이언트 사이드 변경

- [x] `apps/web/src/app/page.tsx`를 클라이언트 컴포넌트로 변경
- [x] `apps/web/src/app/(screener)/DataWrapper.tsx`를 클라이언트 컴포넌트로 변경
- [x] 초기 로딩 시 스켈레톤 표시 (`TableSkeleton`)
- [x] `FilterInitializer` 컴포넌트 삭제 (더 이상 필요 없음)

### 초기 필터 로드 로직 (DataWrapper)

- [x] `DataWrapper`에서 `useEffect`로 마운트 시 localStorage에서 기본 필터 읽기
- [x] URL 쿼리 파라미터 확인 (URL이 있으면 localStorage 건너뜀)
- [x] localStorage 필터를 문자열로 변환하여 `parseFilters`에 전달
- [x] 필터를 직접 사용하여 데이터 페칭 (URL 업데이트는 비동기로 처리)
- [x] localStorage 필터를 URL에 적용 (nuqs 사용)
- [x] URL 파라미터 변경 시 데이터 다시 페칭

## Phase 3: useFilterActions 훅 수정 ✅

### 자동 저장 로직

- [x] `apps/web/src/hooks/useFilterActions.ts` 수정
- [x] `handleFilterChange` 함수에서 필터 변경 후 localStorage 자동 저장
- [x] `saveDefaultFilters` 함수 호출
- [x] debounce 적용 (500ms) - `useRef`와 `setTimeout` 사용
- [x] 저장 실패 시 에러 로그만 출력 (console.error)
- [x] 저장은 비동기로 처리하여 필터 변경 성능에 영향 없도록
- [x] `debouncedSaveFilters` 함수 구현

### 필터 초기화 수정

- [x] `handleFilterReset` 함수 수정
- [x] 필터 초기화 시 localStorage도 초기화 (`clearDefaultFilters`)

## Phase 4: 테스트 및 검증 ⏳

### 기능 테스트

- [ ] 필터 변경 시 localStorage 자동 저장 확인
  - 필터 적용 후 localStorage 확인
  - 저장된 JSON 파싱 확인
- [ ] 페이지 새로고침 시 URL 파라미터 유지 확인
  - 필터 적용 후 URL 확인
  - 새로고침 후 URL 확인
  - 필터 상태 확인
- [ ] URL 없이 접근 시 localStorage 기본값 적용 확인
  - localStorage에 필터 저장
  - URL 없이 페이지 접근 (`/`)
  - localStorage 기본값이 URL로 설정되는지 확인
  - 필터가 적용되는지 확인
- [ ] URL 우선순위 확인
  - localStorage에 기본 필터 저장
  - URL에 다른 필터 설정 (`?ma100Above=true`)
  - URL 필터가 적용되는지 확인
- [ ] 필터 초기화 시 localStorage 초기화 확인
  - 필터 초기화 버튼 클릭
  - localStorage 확인

### 엣지 케이스

- [ ] localStorage 접근 실패 시 기본값 사용 확인
  - localStorage 비활성화 시뮬레이션
  - 기본값으로 동작하는지 확인
- [ ] JSON 파싱 실패 시 기본값 사용 확인
  - 잘못된 JSON 저장 후 테스트
  - 기본값으로 동작하는지 확인
- [ ] 브라우저별 호환성 확인
  - Chrome, Firefox, Safari 테스트

### 성능 테스트

- [ ] debounce가 정상 작동하는지 확인
- [ ] 필터 변경 시 성능 저하 없는지 확인
- [ ] 페이지 로드 시 성능 영향 확인
