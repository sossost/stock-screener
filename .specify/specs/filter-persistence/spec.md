# 필터 값 자동 저장 기능 스펙

## 목표

사용자가 설정한 필터 값을 자동으로 저장하여, 페이지 새로고침 시에도 유지되도록 한다. 모든 필터 상태는 URL 쿼리 파라미터로 관리되며, localStorage는 기본값 저장소로만 사용한다.

## 정의·범위

### 저장 방식 (하이브리드)

- **현재 필터 상태**: URL 쿼리 파라미터로 관리 (기존 방식 유지, 새로고침 시 유지)
- **기본 필터 설정**: localStorage에 자동 저장 (필터 변경 시마다)
- **우선순위**: URL 파라미터 > localStorage 기본값

### 동작 방식

#### 필터 변경 시

1. 사용자가 필터를 변경하면 URL 쿼리 파라미터가 업데이트됨 (기존 동작)
2. **자동으로** 현재 필터 설정을 localStorage에 저장
3. 저장 버튼 없이 자동 동기화

#### 페이지 로드 시

1. **초기 로딩**: 스켈레톤 표시
2. localStorage에서 기본 필터 설정 읽기 (URL이 비어있을 때만)
3. URL 쿼리 파라미터 읽기
4. localStorage 필터를 문자열로 변환하여 파싱
5. **즉시 데이터 페칭**: 파싱된 필터로 API 요청 (localStorage 필터가 있으면 우선 사용)
6. **동시에 URL 업데이트**: localStorage 필터를 URL에 적용 (비동기, 데이터 페칭은 기다리지 않음)
7. URL 파라미터 변경 시 데이터 다시 페칭

### 저장되는 필터

모든 필터 값 저장:

- 이평선 필터: `ordered`, `goldenCross`, `justTurned`, `lookbackDays`
- 이평선 위 필터: `ma20Above`, `ma50Above`, `ma100Above`, `ma200Above`
- 수익성 필터: `profitability`, `turnAround`
- 성장성 필터: `revenueGrowth`, `incomeGrowth`, `revenueGrowthQuarters`, `incomeGrowthQuarters`, `revenueGrowthRate`, `incomeGrowthRate`
- 밸류에이션 필터: `pegFilter`

**저장하지 않는 필터:**

- 티커 검색 (`tickerSearch`) - 임시 검색이므로 저장 불필요

## 데이터 모델

### localStorage 키

- 키: `screener_default_filters`
- 값: `FilterState` 객체의 JSON 문자열

### 데이터 구조

```typescript
interface SavedFilterState {
  ordered?: boolean;
  goldenCross?: boolean;
  justTurned?: boolean;
  lookbackDays?: number;
  profitability?: "all" | "profitable" | "unprofitable";
  turnAround?: boolean;
  revenueGrowth?: boolean;
  incomeGrowth?: boolean;
  revenueGrowthQuarters?: number;
  incomeGrowthQuarters?: number;
  revenueGrowthRate?: number | null;
  incomeGrowthRate?: number | null;
  pegFilter?: boolean;
  ma20Above?: boolean;
  ma50Above?: boolean;
  ma100Above?: boolean;
  ma200Above?: boolean;
}
```

## 상태 관리

### 필터 변경 시 동작

1. 사용자가 필터 다이얼로그에서 "적용" 버튼 클릭
2. `handleFilterApply` → `handleFilterChange` 호출
3. URL 쿼리 파라미터 즉시 업데이트 (기존 동작)
4. **추가**: 변경된 필터 상태를 localStorage에 자동 저장 (debounce 적용)
5. 저장은 비동기로 처리하여 필터 적용 성능에 영향 없음
6. 사용자는 저장 버튼을 누를 필요 없음 (자동 저장)

### 필터 로드 시 동작

1. **클라이언트 사이드 렌더링**: `DataWrapper` 컴포넌트에서 처리
2. `DataWrapper` 마운트 시 (`useEffect`):
   - 초기 로딩 상태로 스켈레톤 표시
   - URL 쿼리 파라미터 확인 (URL이 있으면 localStorage 건너뜀)
   - localStorage에서 기본 필터 읽기 (URL이 비어있을 때만)
   - localStorage 필터를 문자열로 변환하여 `parseFilters`에 전달
   - **즉시 데이터 페칭**: 파싱된 필터로 API 요청
   - **동시에 URL 업데이트**: localStorage 필터를 URL에 적용 (nuqs 사용, 비동기)
3. URL 파라미터 변경 시 (`useEffect`):
   - 변경된 URL 파라미터로 데이터 다시 페칭

### 필터 저장 시점

- **자동 저장**: 필터 다이얼로그에서 "적용" 버튼 클릭 시 자동으로 localStorage에 저장
- 저장 버튼 없음 (사용자가 별도로 저장할 필요 없음)
- debounce 적용 (500ms) - 성능 최적화
- 저장 실패 시에도 사용자 경험에 영향 없음 (에러 로그만 출력)

## 예시 / 수락 기준

### 시나리오 1: 필터 변경 및 자동 저장

**사용자 행동:**

1. 사용자가 필터 카테고리(예: "이평선 필터") 클릭하여 필터 다이얼로그 열기
2. 필터 옵션 선택 (예: 20MA 체크, 50MA 체크, 성장성 필터 활성화)
3. 다이얼로그에서 "적용" 버튼 클릭

**시스템 동작:**

- URL 쿼리 파라미터가 즉시 업데이트됨 (`?ma20Above=true&ma50Above=true&...`)
- localStorage에 자동으로 저장됨 (사용자 액션 불필요)
- 스크리너 결과가 필터에 맞게 업데이트됨

**새로고침 후:**

- URL 파라미터가 유지되어 동일한 필터가 자동 적용됨
- 사용자가 다시 필터를 설정할 필요 없음

### 시나리오 2: URL 없이 접근 (localStorage 기본값 사용)

**사용자 행동:**

1. 사용자가 이전에 필터를 설정하고 적용했음 (localStorage에 저장됨)
2. 브라우저 주소창에 필터 파라미터 없이 스크리너 페이지 접근 (`/` 또는 `/screener`)

**시스템 동작:**

1. **초기 로딩**: 스켈레톤 표시
2. localStorage에서 이전에 저장한 기본 필터 읽기
3. localStorage 필터를 문자열로 변환하여 파싱
4. **즉시 데이터 페칭**: 파싱된 필터로 API 요청 (필터가 적용된 데이터 표시)
5. **동시에 URL 업데이트**: localStorage 필터를 URL에 적용 (비동기)

**사용자 경험:**

- 스켈레톤이 잠시 표시된 후 필터가 적용된 데이터가 표시됨
- 사용자가 별도 액션 없이 이전에 설정한 필터가 자동으로 적용됨
- 마치 "기본 설정"처럼 동작하여 편리함

### 시나리오 3: URL 공유 (URL 우선)

**사용자 행동:**

1. 사용자 A가 기본 필터 저장 (예: 20MA, 50MA)
2. 사용자 B가 URL을 공유받음 (`?ma100Above=true`)

**시스템 동작:**

- URL의 필터(100MA)가 우선 적용됨
- 사용자 B의 localStorage에 저장된 기본값은 무시됨
- URL 파라미터가 항상 우선순위를 가짐

**사용자 경험:**

- 공유받은 URL의 필터가 정확히 적용되어 의도한 결과 확인 가능
- URL 공유 시 필터 상태도 함께 공유됨

### 시나리오 4: 필터 초기화

**사용자 행동:**

1. 필터 다이얼로그에서 "초기화" 버튼 클릭

**시스템 동작:**

- 현재 카테고리의 필터가 기본값으로 초기화됨
- URL 쿼리 파라미터에서 해당 필터 제거
- localStorage의 기본 필터도 초기화됨 (다음 접근 시 필터 없음 상태)

**사용자 경험:**

- 초기화 후에는 필터가 없는 상태로 돌아감
- 다음 접근 시에도 초기화된 상태 유지 (필터 없음)

### 수락 기준

**기본 기능:**

- [ ] 필터 다이얼로그에서 "적용" 버튼 클릭 시 자동으로 localStorage에 저장됨
- [ ] 페이지 새로고침 시 URL 파라미터가 유지되어 필터가 유지됨
- [ ] URL 파라미터가 없을 때 localStorage 기본값이 URL로 설정되어 적용됨
- [ ] URL 파라미터가 있을 때 URL 우선 적용됨
- [ ] 필터 초기화 시 localStorage도 초기화됨

**사용자 경험:**

- [ ] 저장 버튼 없이 자동 저장되어 사용자 편의성 향상
- [ ] 새로고침 후에도 필터가 유지되어 사용자가 다시 설정할 필요 없음
- [ ] URL 공유 시 필터 상태도 함께 공유되어 의도한 결과 확인 가능
- [ ] 브라우저 데이터 삭제 시 기본값(필터 없음)으로 동작함

## 기술적 고려사항

### localStorage 제한

- 용량 제한: 약 5-10MB (필터 데이터는 충분히 작음)
- 브라우저별 지원: 모든 모던 브라우저 지원
- 클라이언트 사이드 렌더링: 전체 페이지가 클라이언트 컴포넌트로 렌더링되어 localStorage 접근 가능 (`useEffect` 사용)

### 에러 처리

- localStorage 접근 실패 시: 기본값 사용, 에러 로그만 출력
- JSON 파싱 실패 시: 기본값 사용, localStorage 값 삭제
- URL 파라미터 파싱 실패 시: localStorage 기본값 사용

### 성능 최적화

- localStorage 저장은 debounce 적용 (500ms)
- 페이지 로드 시 한 번만 읽기
- 필터 변경 시 즉시 URL 업데이트, localStorage는 debounce
- **초기 로딩 최적화**: localStorage 필터를 직접 사용하여 데이터 페칭 (URL 업데이트는 비동기로 처리하여 기다리지 않음)
- **스켈레톤 표시**: 초기 로딩 시 레이아웃 시프트 최소화

### URL 관리

- 모든 필터는 URL 쿼리 파라미터로 관리
- 새로고침 시 URL이 유지되므로 필터 상태 유지
- localStorage는 기본값 저장소로만 사용

## 참고사항

- 기존 URL 쿼리 파라미터 관리 방식(`nuqs`) 유지
- 필터 변경 시 자동 저장 (사용자 액션 불필요)
- URL이 항상 최신 필터 상태를 반영
- 여러 기기 간 동기화는 지원하지 않음 (localStorage 특성상)
