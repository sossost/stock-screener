# Tasks: Golden Cross 스크리너 성장률 필터 기능

**Input**: `.specify/specs/golden-cross-growth-rate-filter/spec.md`, `plan.md`

## Overview

기존 연속 성장 분기 수 필터를 확장하여, **선택한 N분기 동안 평균 성장률이 X% 이상**인 기업을 필터링하는 기능을 추가합니다.

**주요 작업**:
- SQL 쿼리에 평균 성장률 계산 로직 추가 (LAG 함수 사용)
- API 파라미터에 `revenueGrowthRate`, `incomeGrowthRate` 추가
- UI에 성장률 % 입력 필드 추가

---

## Phase 1: 백엔드 API 수정 (User Story 1, 2)

### Task 1.1: [US1][US2] SQL 쿼리에 평균 성장률 계산 로직 추가

**파일**: `src/app/api/screener/golden-cross/route.ts`

**작업 내용**:
- LATERAL JOIN 내부에 평균 매출 성장률 계산 서브쿼리 추가
- LATERAL JOIN 내부에 평균 EPS 성장률 계산 서브쿼리 추가
- LAG 함수를 사용하여 분기별 성장률 계산
- 평균 성장률 계산 (AVG)
- 엣지 케이스 처리: 0 값, NULL 값, 음수→양수 전환

**체크리스트**:
- [ ] 매출 평균 성장률 계산 로직 추가 (`revenue_avg_growth_rate`)
- [ ] EPS 평균 성장률 계산 로직 추가 (`income_avg_growth_rate`)
- [ ] 이전 분기 값이 0인 경우 NULL 처리
- [ ] NULL 값이 포함된 분기는 제외하고 계산

---

### Task 1.2: [US1][US2] API 파라미터 및 필터링 조건 추가

**파일**: `src/app/api/screener/golden-cross/route.ts`

**작업 내용**:
- `revenueGrowthRate` 파라미터 추가 (기본값 30)
- `incomeGrowthRate` 파라미터 추가 (기본값 30)
- 유효성 검사 추가 (0~1000%)
- SQL WHERE 절에 평균 성장률 필터링 조건 추가

**체크리스트**:
- [ ] `revenueGrowthRate` 파라미터 파싱 및 유효성 검사
- [ ] `incomeGrowthRate` 파라미터 파싱 및 유효성 검사
- [ ] `revenueGrowth && revenueGrowthRate` 조건으로 필터링
- [ ] `incomeGrowth && incomeGrowthRate` 조건으로 필터링

---

### Task 1.3: [US1][US2] 응답 타입에 평균 성장률 필드 추가

**파일**: `src/app/api/screener/golden-cross/route.ts`

**작업 내용**:
- QueryResult 타입에 `revenue_avg_growth_rate`, `income_avg_growth_rate` 추가
- 응답 데이터 매핑에 평균 성장률 필드 포함

**체크리스트**:
- [ ] QueryResult 타입 수정
- [ ] 응답 데이터 매핑에 평균 성장률 필드 추가

---

## Phase 2: 프론트엔드 UI 수정 (User Story 1, 2, 4)

### Task 2.1: [US1][US4] GrowthFilterControls에 성장률 입력 필드 추가

**파일**: `src/components/filters/GrowthFilterControls.tsx`

**작업 내용**:
- 매출 성장률 입력 필드 추가 (분기 수 입력 옆)
- EPS 성장률 입력 필드 추가 (분기 수 입력 옆)
- 로컬 상태로 입력값 관리 (입력 중에는 API 호출 안함)
- Enter/blur 시에만 적용
- 유효성 검사 (0~1000%)

**체크리스트**:
- [ ] `revenueGrowthRate` 상태 및 입력 필드 추가
- [ ] `incomeGrowthRate` 상태 및 입력 필드 추가
- [ ] 입력 중 로컬 상태 관리 (debounce 없이 blur/Enter만)
- [ ] 유효성 검사 및 기본값 복원 (30%)
- [ ] 필터 비활성화 시 입력 필드 비활성화

---

### Task 2.2: [US1][US2] GoldenCrossClient에 성장률 파라미터 관리

**파일**: `src/app/screener/golden-cross/GoldenCrossClient.tsx`

**작업 내용**:
- `revenueGrowthRate` URL 쿼리 파라미터 관리
- `incomeGrowthRate` URL 쿼리 파라미터 관리
- `handleFilterChange` 함수에 성장률 파라미터 추가
- 캐시 태그에 성장률 파라미터 포함

**체크리스트**:
- [ ] `useQueryState`로 `revenueGrowthRate` 관리 (기본값 30)
- [ ] `useQueryState`로 `incomeGrowthRate` 관리 (기본값 30)
- [ ] `handleFilterChange`에 성장률 파라미터 추가
- [ ] 캐시 태그에 성장률 파라미터 포함
- [ ] `GrowthFilterControls`에 성장률 setter 전달

---

### Task 2.3: [US1][US2] DataWrapper에 성장률 파라미터 전달

**파일**: `src/app/screener/golden-cross/DataWrapper.tsx`

**작업 내용**:
- SearchParams 타입에 `revenueGrowthRate`, `incomeGrowthRate` 추가
- `fetchGoldenCrossData` 함수에 성장률 파라미터 전달
- 캐시 태그에 성장률 파라미터 포함

**체크리스트**:
- [ ] SearchParams 타입 수정
- [ ] URLSearchParams에 성장률 파라미터 추가
- [ ] 캐시 태그에 성장률 파라미터 포함

---

### Task 2.4: [US4] 테이블 캡션에 필터 조건 표시

**파일**: `src/app/screener/golden-cross/GoldenCrossClient.tsx`

**작업 내용**:
- TableCaption에 평균 성장률 필터 조건 표시
- 예: "최근 4분기 평균 매출 성장률 30% 이상"

**체크리스트**:
- [ ] 매출 성장률 필터 조건 캡션 추가
- [ ] EPS 성장률 필터 조건 캡션 추가

---

## Phase 3: 타입 정의 업데이트 (User Story 1, 2)

### Task 3.1: [US1][US2] 타입 정의 수정

**파일**: `src/types/golden-cross.ts`

**작업 내용**:
- `GoldenCrossCompany` 인터페이스에 `revenue_avg_growth_rate`, `income_avg_growth_rate` 추가
- `GoldenCrossParams` 인터페이스에 `revenueGrowthRate`, `incomeGrowthRate` 추가

**체크리스트**:
- [ ] `GoldenCrossCompany` 타입 수정
- [ ] `GoldenCrossParams` 타입 수정

---

## Phase 4: 테스트 및 검증 (모든 User Story)

### Task 4.1: [US1] 매출 성장률 필터 테스트

**체크리스트**:
- [ ] 필터 선택 시 평균 성장률 기준 필터링 확인
- [ ] 분기 수 변경 시 결과 변화 확인
- [ ] 성장률 변경 시 결과 변화 확인
- [ ] 데이터 부족 종목 제외 확인
- [ ] 음수 성장률 포함 평균 계산 확인

---

### Task 4.2: [US2] EPS 성장률 필터 테스트

**체크리스트**:
- [ ] 필터 선택 시 평균 성장률 기준 필터링 확인
- [ ] 분기 수 변경 시 결과 변화 확인
- [ ] 성장률 변경 시 결과 변화 확인
- [ ] 데이터 부족 종목 제외 확인
- [ ] 음수→양수 전환 케이스 처리 확인

---

### Task 4.3: [US3] 복합 필터 조합 테스트

**체크리스트**:
- [ ] 매출 + EPS 성장률 필터 동시 적용 확인
- [ ] 필터 해제 시 결과 변화 확인
- [ ] 필터 초기화 시 전체 종목 표시 확인

---

### Task 4.4: [US4] UI/UX 테스트

**체크리스트**:
- [ ] 필터 비활성화 시 입력 필드 비활성화 확인
- [ ] 잘못된 값 입력 시 기본값 복원 확인
- [ ] 입력 중 API 호출 없음 확인
- [ ] Enter/blur 시 필터 적용 확인

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (백엔드)**: 모든 Phase의 기반 - 먼저 완료 필요
- **Phase 2 (프론트엔드)**: Phase 1 완료 후 시작 가능
- **Phase 3 (타입)**: Phase 1, 2와 병렬 가능
- **Phase 4 (테스트)**: Phase 1, 2, 3 완료 후 진행

### Task Dependencies

- Task 1.1 → Task 1.2 → Task 1.3 (순차)
- Task 2.1 → Task 2.2 → Task 2.3 (순차)
- Task 2.4는 Task 2.2 완료 후 가능
- Task 3.1은 Phase 1, 2와 병렬 가능

---

## Notes

- 기존 연속 성장 분기 수 필터와 독립적으로 동작 (두 필터는 별개)
- SQL 쿼리 성능 최적화 필요 (LAG 함수 사용 시 인덱스 확인)
- 캐시 태그에 성장률 파라미터 포함하여 필터별 캐싱 유지
- 엣지 케이스 (0, NULL, 음수) 처리 로직 명확히 구현

