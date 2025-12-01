# 테이블 정렬 상태 자동 저장 기능

## 개요

사용자가 테이블에서 정렬을 변경하면, 해당 정렬 상태를 localStorage에 자동으로 저장하여 페이지 새로고침 또는 재접속 시에도 마지막 정렬 상태를 유지합니다.

## 배경

필터 자동 저장 기능과 동일한 패턴으로, 사용자 경험을 개선하기 위해 테이블 정렬 상태도 자동으로 저장하고 복원하는 기능이 필요합니다.

## 요구사항

### 기능 요구사항

1. **정렬 상태 저장**
   - 사용자가 테이블 헤더를 클릭하여 정렬을 변경하면 자동으로 localStorage에 저장
   - 저장 키: `screener_table_sort`
   - 저장 형식: JSON (`{ key: SortKey, direction: "asc" | "desc" }`)

2. **정렬 상태 복원**
   - 페이지 로드 시 localStorage에서 정렬 상태 읽기
   - 저장된 정렬 상태가 있으면 해당 상태로 초기화
   - 저장된 정렬 상태가 없으면 기본 정렬 사용 (`market_cap desc`)

3. **에러 처리**
   - localStorage 접근 실패 시 기본 정렬 사용
   - JSON 파싱 실패 시 잘못된 데이터 삭제 후 기본 정렬 사용
   - SSR 환경에서는 localStorage 접근하지 않음

### 비기능 요구사항

1. **성능**
   - 정렬 변경 시 즉시 저장 (debounce 불필요, 정렬 변경 빈도가 낮음)
   - localStorage 접근 실패 시에도 사용자 경험 방해하지 않음

2. **타입 안전성**
   - SortKey와 direction 타입 검증
   - 유효하지 않은 데이터는 자동으로 삭제

## 기술 스택

- **저장소**: localStorage
- **타입**: TypeScript
- **테스트**: Vitest

## 구현 세부사항

### 1. 유틸리티 함수 (`utils/sort-storage.ts`)

```typescript
export type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

// 정렬 상태 저장
export function saveSortState(sortState: SortState): void

// 정렬 상태 로드
export function loadSortState(): SortState | null

// 정렬 상태 삭제
export function clearSortState(): void
```

### 2. StockTable 컴포넌트 수정

- 마운트 시 `loadSortState()`로 정렬 상태 로드
- 정렬 변경 시 `saveSortState()`로 자동 저장
- `useEffect`를 사용하여 정렬 상태 변경 감지 및 저장

## 사용자 시나리오

### 시나리오 1: 정렬 변경 및 저장

1. 사용자가 테이블에서 "RS" 컬럼 헤더 클릭
2. 정렬이 "rs_score desc"로 변경됨
3. localStorage에 자동으로 저장됨

### 시나리오 2: 페이지 새로고침 후 정렬 유지

1. 사용자가 "RS" 컬럼으로 정렬한 상태
2. 페이지 새로고침 (F5)
3. 페이지 로드 시 localStorage에서 정렬 상태 읽기
4. "RS" 컬럼으로 정렬된 상태로 표시됨

### 시나리오 3: 재접속 후 정렬 유지

1. 사용자가 "PER" 컬럼으로 정렬한 상태
2. 브라우저 탭 닫기
3. 다시 접속
4. 페이지 로드 시 localStorage에서 정렬 상태 읽기
5. "PER" 컬럼으로 정렬된 상태로 표시됨

## 테스트 시나리오

### 단위 테스트

1. `saveSortState`: 정렬 상태 저장 확인
2. `loadSortState`: 정렬 상태 로드 확인
3. `clearSortState`: 정렬 상태 삭제 확인
4. 에러 처리: localStorage 접근 실패 시 기본값 사용
5. 유효성 검증: 유효하지 않은 데이터 자동 삭제

### 통합 테스트

1. 정렬 변경 시 localStorage 저장 확인
2. 페이지 로드 시 정렬 상태 복원 확인
3. 저장된 정렬 상태가 없을 때 기본 정렬 사용 확인

## 제약사항

1. **브라우저 호환성**: localStorage를 지원하는 브라우저에서만 동작
2. **도메인별 저장**: 같은 도메인 내에서만 정렬 상태 공유
3. **SSR 환경**: 서버 사이드에서는 localStorage 접근 불가

## 향후 개선 사항

1. 정렬 상태를 URL 파라미터로도 관리 (공유 가능)
2. 여러 정렬 조건 지원 (다중 정렬)
3. 정렬 히스토리 관리

