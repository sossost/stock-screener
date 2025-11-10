# Implementation Plan: 주식 스크리너 리팩토링

**Branch**: `feature/golden-cross-refactoring` | **Date**: 2025-11-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/golden-cross-refactoring/spec.md`

## Summary

주식 스크리너 컴포넌트(`GoldenCrossClient.tsx`, 654줄, 티커 검색 필터 포함)를 리팩토링하여 관심사를 분리하고 재사용성을 향상시킵니다. 타입 정의, 포맷팅 함수, 상태 관리 로직(11개 useQueryState), 티커 검색 로직, 필터 액션, 테이블 렌더링을 각각 적절한 모듈로 분리하여 유지보수성을 개선합니다. 또한 폴더명과 컴포넌트명을 "골든크로스"에서 "스크리너"로 변경하여 실제 기능에 맞게 명명합니다.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 15, React 19  
**Primary Dependencies**: Next.js, React, nuqs, shadcn/ui  
**Storage**: N/A (프론트엔드 리팩토링)  
**Testing**: Vitest (기존 테스트 프레임워크 유지)  
**Target Platform**: Web (Next.js App Router)  
**Project Type**: Web application (Next.js App Router 기반)  
**Performance Goals**: 리팩토링 후에도 동일한 성능 유지  
**Constraints**: 기존 기능 정상 작동(티커 검색 필터 포함), 모든 테스트 통과, 빌드 성공  
**Scale/Scope**: 단일 컴포넌트 리팩토링 (654줄 → 여러 모듈로 분리, 티커 검색 필터 포함)

## Constitution Check

- ✅ 기존 프로젝트 구조 활용 (새 프로젝트 생성 불필요)
- ✅ 기존 기술 스택 유지 (Next.js, React, TypeScript)
- ✅ 기존 테스트 프레임워크 유지 (Vitest)
- ✅ 기존 기능 유지 (리팩토링만 수행)

## Project Structure

### Documentation (this feature)

```text
specs/golden-cross-refactoring/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task list
```

### Source Code (repository root)

```text
src/
├── types/
│   └── golden-cross.ts              # 타입 정의 통합 (확장)
├── utils/
│   └── format.ts                    # 포맷팅 함수 통합 (확장)
├── hooks/
│   ├── useFilterState.ts            # 필터 상태 관리 훅 (신규)
│   ├── useTickerSearch.ts           # 티커 검색 로직 훅 (신규)
│   └── useFilterActions.ts         # 필터 액션 훅 (신규)
├── components/
│   └── screener/
│       └── StockTable.tsx           # 테이블 컴포넌트 (신규)
└── app/
    └── screener/
        └── main/ (또는 screener/)
            └── ScreenerClient.tsx # 리팩토링된 메인 컴포넌트 (이름 변경)
```

**Structure Decision**: 기존 Next.js App Router 구조를 유지하며, 관심사별로 모듈을 분리합니다.

## Implementation Approach

### Phase 0: 이름 변경 (선택적, 리팩토링 전 또는 후)

- 폴더명 변경: `src/app/screener/golden-cross/` → `src/app/screener/main/` (또는 `src/app/screener/`)
- 컴포넌트명 변경: `GoldenCrossClient` → `ScreenerClient`
- 타입명 변경: `GoldenCrossCompany` → `ScreenerCompany`, `GoldenCrossClientProps` → `ScreenerClientProps`
- 파일명 변경: `GoldenCrossClient.tsx` → `ScreenerClient.tsx`
- 모든 import 경로 업데이트
- API 경로는 유지 (하위 호환성)

### Phase 1: 타입 정의 및 포맷팅 함수 분리 (P1)

- `ScreenerClient.tsx` (또는 `GoldenCrossClient.tsx`)에서 타입 정의 추출
- `src/types/screener.ts`에 타입 통합 (또는 `golden-cross.ts` 유지)
- `ScreenerClient.tsx`에서 포맷팅 함수 추출
- `src/utils/format.ts`에 포맷팅 함수 통합
- 컴포넌트에서 import 경로 업데이트
- 테스트 및 빌드 확인

### Phase 2: 필터 상태 관리 훅 분리 (P1)

- `ScreenerClient.tsx`에서 모든 `useQueryState` 추출
- `src/hooks/useFilterState.ts` 생성
- 필터 상태 타입 정의
- 필터 상태 조작 메서드 제공
- 컴포넌트에서 훅 사용
- 테스트 및 빌드 확인

### Phase 3: 티커 검색 훅 분리 (P2)

- `ScreenerClient.tsx`에서 티커 검색 로직 추출
  - tickerSearchInput, tickerSearch (useState)
  - debounce (useEffect, 300ms, startTransition)
  - useDeferredValue 최적화
  - filteredData (useMemo)
- `src/hooks/useTickerSearch.ts` 생성
- debounce 및 useDeferredValue 로직 포함
- 컴포넌트에서 훅 사용
- 테스트 및 빌드 확인

### Phase 4: 필터 액션 훅 분리 (P2)

- `ScreenerClient.tsx`에서 필터 액션 함수 추출
- `src/hooks/useFilterActions.ts` 생성
- `handleFilterChange`, `handleFilterApply`, `handleFilterReset` 로직 포함
- 캐시 무효화 로직 포함
- 컴포넌트에서 훅 사용
- 테스트 및 빌드 확인

### Phase 5: 테이블 컴포넌트 분리 (P3)

- `ScreenerClient.tsx`에서 테이블 렌더링 로직 추출
  - 테이블 헤더 (종목, 시가총액, 종가, PER, PEG, 매출, EPS)
  - 테이블 바디 (종목 행 렌더링, 차트 포함)
  - 테이블 캡션 (필터 요약 동적 생성)
  - 빈 상태 메시지 (검색 결과 없음)
- `src/components/screener/StockTable.tsx` 생성
- 컴포넌트에서 사용
- 테스트 및 빌드 확인

## Key Technical Decisions

### 1. 점진적 리팩토링

**Decision**: 한 번에 모든 것을 바꾸지 않고 단계적으로 진행

**Rationale**:
- 각 단계마다 테스트 및 빌드 확인 가능
- 문제 발생 시 롤백 용이
- 기능 정상 작동 보장

**Trade-offs**:
- 시간이 더 걸릴 수 있음
- 하지만 안정성이 더 중요

### 2. 커스텀 훅 사용

**Decision**: 상태 관리 및 비즈니스 로직을 커스텀 훅으로 분리

**Rationale**:
- 재사용성 향상
- 테스트 용이
- 관심사 분리

**Trade-offs**:
- 추가 파일 생성
- 하지만 유지보수성 향상

### 3. 컴포넌트 크기 제한

**Decision**: 각 모듈을 300줄 이하로 유지

**Rationale**:
- 가독성 향상
- 유지보수 용이
- 단일 책임 원칙 준수

**Trade-offs**:
- 파일 수 증가
- 하지만 각 파일의 복잡도 감소

## Dependencies

### External Dependencies

- 기존 의존성 유지 (Next.js, React, nuqs, shadcn/ui)

### Internal Dependencies

- `GoldenCrossClient.tsx`: 리팩토링 대상
- `src/types/golden-cross.ts`: 타입 정의 통합
- `src/utils/format.ts`: 포맷팅 함수 통합
- `src/lib/filter-summary.ts`: 필터 요약 로직 (기존)

## Risks & Mitigations

### Risk 1: 리팩토링 중 기능 손상

**Mitigation**: 
- 각 단계마다 테스트 및 빌드 확인
- 점진적 리팩토링
- Git 커밋으로 각 단계 저장

### Risk 2: Import 경로 오류

**Mitigation**:
- 타입스크립트 컴파일러로 경로 확인
- 린터로 경로 검증
- 빌드 테스트로 확인

### Risk 3: 의존성 순환

**Mitigation**:
- 훅 간 의존성 최소화
- 공통 타입은 `src/types/`에 배치
- 의존성 그래프 확인

## Success Metrics

- `ScreenerClient.tsx` 파일 크기가 300줄 이하로 감소 (현재 654줄)
- 모든 타입 정의가 `src/types/screener.ts` (또는 `golden-cross.ts`)에 위치
- 모든 포맷팅 함수가 `src/utils/format.ts`, `src/utils/chart-data.ts`에 위치
- 필터 상태 관리가 `useFilterState` 훅으로 분리됨 (11개 useQueryState)
- 티커 검색 로직이 `useTickerSearch` 훅으로 분리됨 (debounce, useDeferredValue 포함)
- 필터 액션이 `useFilterActions` 훅으로 분리됨 (handleFilterChange, handleFilterApply, handleFilterReset)
- 테이블 렌더링이 `StockTable` 컴포넌트로 분리됨
- 리팩토링 후 모든 기존 테스트가 통과함 (49개 테스트)
- 리팩토링 후 빌드가 성공함
- 리팩토링 후 기존 기능이 정상 작동함 (티커 검색 필터 포함)

