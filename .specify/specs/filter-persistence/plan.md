# 필터 값 자동 저장 기능 구현 계획

## Phase 1: localStorage 유틸리티 구현 ✅

### 1.1 필터 저장/로드 함수

- [x] `apps/web/src/utils/filter-storage.ts` 파일 생성
- [x] `saveDefaultFilters(filterState: FilterState): void` 함수
  - FilterState를 JSON으로 변환하여 localStorage에 저장
  - 에러 처리 (try-catch)
- [x] `loadDefaultFilters(): Partial<FilterState> | null` 함수
  - localStorage에서 읽기
  - JSON 파싱
  - 파싱 실패 시 null 반환 및 localStorage 값 삭제
- [x] `clearDefaultFilters(): void` 함수
  - localStorage에서 필터 삭제

### 1.2 필터 병합 로직

- [x] `mergeFilters(defaultFilters, urlFilters): FilterState` 함수
- [x] URL 파라미터 우선순위 적용
- [x] `filterDefaults`와 병합하여 완전한 FilterState 생성

## Phase 2: 클라이언트 사이드 렌더링으로 변경 및 초기 필터 로드 ✅

### 2.1 서버 사이드 → 클라이언트 사이드 변경

- [x] `apps/web/src/app/page.tsx`를 클라이언트 컴포넌트로 변경
- [x] `apps/web/src/app/(screener)/DataWrapper.tsx`를 클라이언트 컴포넌트로 변경
- [x] 초기 로딩 시 스켈레톤 표시 (`TableSkeleton`)
- [x] `FilterInitializer` 컴포넌트 삭제 (더 이상 필요 없음)

### 2.2 초기 필터 로드 로직 (DataWrapper)

- [x] `DataWrapper`에서 `useEffect`로 마운트 시 localStorage에서 기본 필터 읽기
- [x] URL 쿼리 파라미터 확인 (URL이 있으면 localStorage 건너뜀)
- [x] localStorage 필터를 문자열로 변환하여 `parseFilters`에 전달
- [x] 필터를 직접 사용하여 데이터 페칭 (URL 업데이트는 비동기로 처리)
- [x] localStorage 필터를 URL에 적용 (nuqs 사용)

### 2.3 초기화 순서

1. 스켈레톤 표시
2. localStorage에서 기본 필터 읽기 (URL이 비어있을 때만)
3. localStorage 필터를 문자열로 변환하여 파싱
4. 파싱된 필터로 데이터 페칭 (즉시)
5. 동시에 localStorage 필터를 URL에 적용 (비동기)
6. URL 파라미터 변경 시 데이터 다시 페칭

## Phase 3: useFilterActions 훅 수정 ✅

### 3.1 자동 저장 로직

- [x] `apps/web/src/hooks/useFilterActions.ts` 수정
- [x] `handleFilterChange` 함수에서 필터 변경 후 localStorage 자동 저장
- [x] debounce 적용 (500ms) - `useRef`와 `setTimeout` 사용
- [x] 저장 실패 시 에러 로그만 출력 (사용자 경험 방해하지 않음)
- [x] `debouncedSaveFilters` 함수 구현

### 3.2 필터 초기화 수정

- [x] `handleFilterReset` 함수에서 localStorage도 초기화
- [x] `clearDefaultFilters` 호출

## Phase 4: 테스트 및 검증 ⏳

### 4.1 기능 테스트

- [ ] 필터 변경 시 localStorage 자동 저장 확인
- [ ] 페이지 새로고침 시 URL 파라미터 유지 확인
- [ ] URL 없이 접근 시 localStorage 기본값 적용 확인
- [ ] URL 우선순위 확인
- [ ] 필터 초기화 시 localStorage 초기화 확인

### 4.2 엣지 케이스

- [ ] localStorage 접근 실패 시 기본값 사용 확인
- [ ] JSON 파싱 실패 시 기본값 사용 확인
- [ ] 브라우저별 호환성 확인

## 구현 완료 내역

### 완료된 작업

1. ✅ Phase 1: localStorage 유틸리티 함수 구현
2. ✅ Phase 2: 클라이언트 사이드 렌더링으로 변경 및 초기 필터 로드
3. ✅ Phase 3: useFilterActions 훅 수정 (자동 저장)
4. ⏳ Phase 4: 테스트 및 검증 (대기 중)

### 주요 변경 사항

- **서버 사이드 → 클라이언트 사이드**: 초기 로딩 성능 개선 및 localStorage 접근 가능
- **초기 로딩 최적화**: 스켈레톤 표시 후 필터 로드 → 데이터 페칭 순서로 변경
- **필터 자동 저장**: 필터 변경 시 500ms debounce로 localStorage에 자동 저장
- **필터 초기화**: 필터 초기화 시 localStorage도 함께 초기화

### 남은 작업

- Phase 4: 테스트 및 검증
