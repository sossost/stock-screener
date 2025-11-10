# 리팩토링 검수 결과

**검수 일자**: 2025-11-10  
**최신화 일자**: 2025-11-10  
**대상**: 전체 코드베이스 (티커 검색 필터 포함)  
**목적**: 추상화 및 관심사 분리 검토

## 🔍 주요 발견사항

### 1. **주식 스크리너 컴포넌트 - 과도한 책임 (654줄)**

**현재 이름**: `GoldenCrossClient.tsx` (골든크로스 스크리너가 아닌 통합 스크리너)

**문제점:**
- 단일 컴포넌트가 너무 많은 책임을 가짐
- 필터 상태 관리, 티커 검색, 테이블 렌더링, 포맷팅 등이 모두 한 파일에

**현재 구조:**
```
GoldenCrossClient.tsx (654줄) - 이름 변경 필요: ScreenerClient.tsx
├── 타입 정의 (37-63줄)
│   ├── QuarterlyFinancial
│   ├── GoldenCrossCompany
│   └── GoldenCrossClientProps
├── 포맷팅 함수들 (65-105줄)
│   ├── formatQuarter
│   ├── prepareChartData
│   └── formatRatio
├── 11개의 useQueryState (115-180줄)
│   ├── ordered, goldenCross, justTurned, lookbackDays
│   ├── profitability
│   ├── revenueGrowth, revenueGrowthQuarters, revenueGrowthRate
│   ├── incomeGrowth, incomeGrowthQuarters, incomeGrowthRate
│   └── pegFilter
├── 티커 검색 로직 (185-206줄)
│   ├── tickerSearchInput, tickerSearch (useState)
│   ├── debounce (useEffect, 300ms)
│   ├── useDeferredValue 최적화
│   └── filteredData (useMemo)
├── 필터 변경 핸들러 (225-283줄)
│   ├── handleFilterChange (12개 파라미터)
│   ├── 캐시 무효화 로직
│   └── URL 업데이트 및 리패치
├── 필터 적용/초기화 핸들러 (286-355줄)
│   ├── handleFilterApply
│   └── handleFilterReset (카테고리별)
└── 렌더링 로직 (360-654줄)
    ├── 필터박스 UI
    ├── 티커 검색 인풋
    ├── 테이블 렌더링
    └── 스켈레톤 로딩
```

**리팩토링 제안:**

#### 1.1 커스텀 훅으로 분리

**`src/hooks/useFilterState.ts`**
- 모든 `useQueryState` 로직을 한 곳으로 모음
- 필터 상태 타입 정의 포함
- 필터 상태 조작 메서드 제공

**`src/hooks/useTickerSearch.ts`**
- 티커 검색 입력값 관리
- Debounce 로직
- useDeferredValue 최적화

**`src/hooks/useFilterActions.ts`**
- `handleFilterChange` 로직
- `handleFilterApply` 로직
- `handleFilterReset` 로직
- 캐시 무효화 로직

#### 1.2 유틸리티 함수 분리

**`src/utils/format.ts` (확장)**
- `formatQuarter` 함수 이동
- `formatRatio` 함수 이동
- `prepareChartData` 함수 이동

#### 1.3 타입 정의 분리

**`src/types/screener.ts` (또는 `golden-cross.ts` 유지)**
- `QuarterlyFinancial` 타입 이동
- `GoldenCrossCompany` → `ScreenerCompany` 타입 이동 (이름 변경)
- `GoldenCrossClientProps` → `ScreenerClientProps` 타입 이동 (이름 변경)

#### 1.4 테이블 컴포넌트 분리

**`src/components/screener/StockTable.tsx`**
- 테이블 헤더
- 테이블 바디
- 테이블 캡션 (필터 요약)
- 빈 상태 메시지

**`src/components/screener/StockTableRow.tsx`**
- 개별 종목 행 렌더링
- 차트 데이터 준비
- 링크 처리

### 2. **필터 상태 관리 복잡도**

**문제점:**
- `handleFilterChange` 함수가 12개의 파라미터를 받음
- 필터 초기화 로직이 카테고리별로 중복됨
- 캐시 태그 생성 로직이 하드코딩됨

**리팩토링 제안:**

#### 2.1 필터 상태 객체화

```typescript
// 현재
handleFilterChange(
  newOrdered, newGoldenCross, newJustTurned, ...
)

// 개선
handleFilterChange({
  ordered: newOrdered,
  goldenCross: newGoldenCross,
  ...
})
```

#### 2.2 캐시 태그 생성 유틸리티

**`src/lib/cache-tags.ts`**
- 필터 상태를 기반으로 캐시 태그 생성
- 중앙화된 캐시 관리

#### 2.3 필터 초기화 로직 추상화

**`src/lib/filter-defaults.ts`**
- 카테고리별 기본값 정의
- 초기화 로직 통합

### 3. **테이블 캡션 복잡도**

**문제점:**
- 테이블 캡션에 필터 요약을 동적으로 생성하는 로직이 JSX에 직접 포함
- 조건부 렌더링이 복잡함

**리팩토링 제안:**

#### 3.1 캡션 생성 함수

**`src/lib/table-caption.ts`**
- 필터 상태를 기반으로 캡션 텍스트 생성
- 테스트 가능한 순수 함수

### 4. **포맷팅 함수 중복 가능성**

**문제점:**
- `formatNumber`는 이미 `src/utils/format.ts`에 있음
- `formatQuarter`, `formatRatio`는 컴포넌트 내부에 있음

**리팩토링 제안:**
- 모든 포맷팅 함수를 `src/utils/format.ts`로 통합

## 📊 리팩토링 우선순위

### P0 (선택적, 리팩토링 전 또는 후)
0. 이름 변경: 폴더명, 컴포넌트명, 타입명을 "골든크로스"에서 "스크리너"로 변경

### P1 (즉시)
1. 타입 정의 분리 (`src/types/screener.ts` 또는 `golden-cross.ts` 유지)
2. 포맷팅 함수 분리 (`src/utils/format.ts`, `src/utils/chart-data.ts`)
3. 필터 상태 관리 훅 (`src/hooks/useFilterState.ts`)

### P2 (단기)
4. 티커 검색 훅 (`src/hooks/useTickerSearch.ts`)
5. 필터 액션 훅 (`src/hooks/useFilterActions.ts`)
6. 테이블 컴포넌트 분리 (`src/components/screener/StockTable.tsx`)

### P3 (중기)
7. 캐시 태그 유틸리티 (`src/lib/cache-tags.ts`)
8. 필터 기본값 관리 (`src/lib/filter-defaults.ts`)
9. 테이블 캡션 생성 함수 (`src/lib/table-caption.ts`)

## 🎯 예상 효과

### 코드 가독성
- **Before**: 654줄의 단일 파일
- **After**: 10-15개의 작은 모듈로 분리

### 유지보수성
- 각 모듈이 단일 책임을 가짐
- 테스트 작성이 용이해짐
- 변경 영향 범위가 명확해짐

### 재사용성
- 훅과 유틸리티 함수를 다른 컴포넌트에서도 사용 가능
- 테이블 컴포넌트를 다른 스크리너에서도 재사용 가능

## ⚠️ 주의사항

1. **점진적 리팩토링**: 한 번에 모든 것을 바꾸지 말고 단계적으로 진행
2. **테스트 유지**: 리팩토링 중에도 모든 테스트가 통과해야 함
3. **타입 안정성**: 타입 정의 분리 시 import 경로 확인 필요
4. **성능 영향**: 훅 분리 시 불필요한 리렌더링이 발생하지 않도록 주의

## 📝 다음 단계

1. 리팩토링 계획 수립 (spec.md, plan.md, tasks.md)
2. P1 우선순위부터 시작
3. 각 단계마다 테스트 및 빌드 확인
4. 점진적으로 P2, P3 진행

