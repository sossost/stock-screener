# 테이블 정렬 상태 자동 저장 기능 구현 계획

## Phase 1: 유틸리티 함수 구현 ✅

### 1.1 sort-storage.ts 생성

- [x] `apps/web/src/utils/sort-storage.ts` 파일 생성
- [x] `SortState` 타입 정의
- [x] `saveSortState(sortState: SortState): void` 함수 구현
  - SortState를 JSON.stringify로 변환
  - localStorage.setItem으로 저장
  - try-catch로 에러 처리
- [x] `loadSortState(): SortState | null` 함수 구현
  - localStorage.getItem으로 읽기
  - JSON.parse로 파싱
  - 유효성 검증 (key, direction)
  - 파싱 실패 또는 유효하지 않은 데이터 시 null 반환 및 localStorage.removeItem
- [x] `clearSortState(): void` 함수 구현
  - localStorage.removeItem으로 삭제
- [x] 타입 정의 및 에러 처리 완료

## Phase 2: StockTable 컴포넌트 수정 ✅

### 2.1 정렬 상태 로드

- [x] `StockTable.tsx`에서 `loadSortState` import
- [x] `useState` 초기값으로 `loadSortState()` 사용
- [x] 저장된 정렬 상태가 없으면 기본 정렬 사용

### 2.2 정렬 상태 저장

- [x] `useEffect`로 정렬 상태 변경 감지
- [x] 정렬 상태 변경 시 `saveSortState()` 호출
- [x] 정렬 변경 시 즉시 저장 (debounce 불필요)

## Phase 3: 테스트 코드 작성 ✅

### 3.1 단위 테스트

- [x] `apps/web/src/lib/__tests__/sort-storage.test.ts` 파일 생성
- [x] `saveSortState` 테스트
  - 정상 저장 확인
  - localStorage 접근 실패 처리
  - SSR 환경 처리
- [x] `loadSortState` 테스트
  - 정상 로드 확인
  - localStorage가 비어있을 때 null 반환
  - 잘못된 JSON 처리
  - 유효하지 않은 데이터 처리
  - localStorage 접근 실패 처리
  - SSR 환경 처리
  - 모든 유효한 SortKey 테스트
  - asc/desc direction 테스트
- [x] `clearSortState` 테스트
  - 정상 삭제 확인
  - localStorage 접근 실패 처리
  - SSR 환경 처리

## Phase 4: 문서 작성 ✅

### 4.1 스펙 문서

- [x] `.specify/specs/table-sort-persistence/spec.md` 작성
  - 개요, 배경, 요구사항
  - 기술 스택, 구현 세부사항
  - 사용자 시나리오, 테스트 시나리오

### 4.2 계획 문서

- [x] `.specify/specs/table-sort-persistence/plan.md` 작성
  - 구현 단계별 계획
  - 완료 체크리스트

### 4.3 작업 목록

- [x] `.specify/specs/table-sort-persistence/tasks.md` 작성
  - 상세 작업 목록

## Phase 5: 코드 리뷰 및 검증 ⏳

### 5.1 코드 리뷰 체크리스트

- [ ] 설계 및 구조 검증
- [ ] 타입 안전성 검증
- [ ] 에러 핸들링 검증
- [ ] UI/UX 검증

### 5.2 최종 검증

- [ ] 린트 통과
- [ ] 테스트 통과
- [ ] 빌드 통과
- [ ] 수동 테스트 (브라우저)

## 구현 완료 내역

### 완료된 작업

1. ✅ Phase 1: 유틸리티 함수 구현
2. ✅ Phase 2: StockTable 컴포넌트 수정
3. ✅ Phase 3: 테스트 코드 작성
4. ✅ Phase 4: 문서 작성
5. ⏳ Phase 5: 코드 리뷰 및 검증

### 주요 변경 사항

- **정렬 상태 저장**: 정렬 변경 시 localStorage에 자동 저장
- **정렬 상태 복원**: 페이지 로드 시 localStorage에서 정렬 상태 읽기
- **에러 처리**: localStorage 접근 실패 시 기본 정렬 사용
- **유효성 검증**: 유효하지 않은 데이터 자동 삭제

### 남은 작업

- Phase 5: 코드 리뷰 및 검증
