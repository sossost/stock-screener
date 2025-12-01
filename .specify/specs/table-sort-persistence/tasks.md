# 테이블 정렬 상태 자동 저장 기능 작업 목록

## Phase 1: 유틸리티 함수 구현 ✅

### sort-storage.ts 생성

- [x] `apps/web/src/utils/sort-storage.ts` 파일 생성
- [x] `SortState` 타입 정의
  - `key: SortKey`
  - `direction: "asc" | "desc"`
- [x] `saveSortState(sortState: SortState): void` 함수 구현
  - SortState를 JSON.stringify로 변환
  - localStorage.setItem으로 저장
  - try-catch로 에러 처리
  - window가 undefined인 경우 처리 (SSR)
- [x] `loadSortState(): SortState | null` 함수 구현
  - localStorage.getItem으로 읽기
  - JSON.parse로 파싱
  - 유효성 검증 (key가 string이고, direction이 "asc" 또는 "desc")
  - 파싱 실패 또는 유효하지 않은 데이터 시 null 반환 및 localStorage.removeItem
  - window가 undefined인 경우 처리 (SSR)
- [x] `clearSortState(): void` 함수 구현
  - localStorage.removeItem으로 삭제
  - try-catch로 에러 처리
  - window가 undefined인 경우 처리 (SSR)
- [x] 타입 정의 및 에러 처리 완료

## Phase 2: StockTable 컴포넌트 수정 ✅

### 정렬 상태 로드

- [x] `StockTable.tsx`에서 `loadSortState`, `saveSortState` import
- [x] `useState` 초기값으로 `loadSortState()` 사용
  - 저장된 정렬 상태가 있으면 해당 상태 사용
  - 저장된 정렬 상태가 없으면 기본 정렬 사용 (`defaultSort`)
- [x] `SortState` 타입을 `StoredSortState`로 import하여 사용

### 정렬 상태 저장

- [x] `useEffect`로 정렬 상태 변경 감지
- [x] 정렬 상태 변경 시 `saveSortState()` 호출
- [x] 정렬 변경 시 즉시 저장 (debounce 불필요, 정렬 변경 빈도가 낮음)

## Phase 3: 테스트 코드 작성 ✅

### 단위 테스트

- [x] `apps/web/src/lib/__tests__/sort-storage.test.ts` 파일 생성
- [x] `saveSortState` 테스트
  - [x] 정상 저장 확인
  - [x] localStorage 접근 실패 처리
  - [x] SSR 환경 처리
- [x] `loadSortState` 테스트
  - [x] 정상 로드 확인
  - [x] localStorage가 비어있을 때 null 반환
  - [x] 잘못된 JSON 처리
  - [x] 유효하지 않은 데이터 처리 (key 없음, direction 잘못됨)
  - [x] localStorage 접근 실패 처리
  - [x] SSR 환경 처리
  - [x] 모든 유효한 SortKey 테스트
  - [x] asc/desc direction 테스트
- [x] `clearSortState` 테스트
  - [x] 정상 삭제 확인
  - [x] localStorage 접근 실패 처리
  - [x] SSR 환경 처리

## Phase 4: 문서 작성 ✅

### 스펙 문서

- [x] `.specify/specs/table-sort-persistence/spec.md` 작성
  - [x] 개요, 배경, 요구사항
  - [x] 기술 스택, 구현 세부사항
  - [x] 사용자 시나리오, 테스트 시나리오
  - [x] 제약사항, 향후 개선 사항

### 계획 문서

- [x] `.specify/specs/table-sort-persistence/plan.md` 작성
  - [x] 구현 단계별 계획
  - [x] 완료 체크리스트

### 작업 목록

- [x] `.specify/specs/table-sort-persistence/tasks.md` 작성
  - [x] 상세 작업 목록

## Phase 5: 코드 리뷰 및 검증 ⏳

### 코드 리뷰 체크리스트

- [ ] 설계 및 구조 검증
  - [ ] DRY 원칙 준수
  - [ ] 단일 책임 원칙 (SRP)
  - [ ] 매직 넘버/스트링 사용 여부
- [ ] 타입 안전성 검증
  - [ ] any 타입 사용 여부
  - [ ] Null/Undefined 처리
- [ ] 에러 핸들링 검증
  - [ ] 예외 처리 전략
  - [ ] 입력 값 검증
- [ ] UI/UX 검증
  - [ ] 사용자 경험 개선 확인
  - [ ] 에러 상황 처리

### 최종 검증

- [ ] 린트 통과 (`yarn lint`)
- [ ] 테스트 통과 (`yarn test`)
- [ ] 빌드 통과 (`yarn build`)
- [ ] 수동 테스트 (브라우저)
  - [ ] 정렬 변경 시 localStorage 저장 확인
  - [ ] 페이지 새로고침 후 정렬 상태 유지 확인
  - [ ] 재접속 후 정렬 상태 유지 확인

## 완료 체크리스트

- [x] 기능 구현 완료
- [x] 테스트 코드 작성 완료
- [x] 문서 작성 완료
- [ ] 코드 리뷰 완료
- [ ] 최종 검증 완료
- [ ] 커밋 준비 완료

