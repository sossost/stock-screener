# Implementation Plan: 티커 검색 필터

**Branch**: `feature/ticker-search-filter` | **Date**: 2025-11-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/ticker-search-filter/spec.md`

## Summary

스크리너 테이블에 티커(심볼) 검색 기능을 추가하여 사용자가 원하는 종목을 빠르게 찾을 수 있도록 합니다. 검색 인풋에 티커의 일부를 입력하면 부분 일치 검색이 수행되어 해당하는 종목만 테이블에 표시됩니다.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 15, React 19  
**Primary Dependencies**: Next.js, React, nuqs (URL 쿼리 파라미터 관리)  
**Storage**: 클라이언트 사이드 필터링 (서버 요청 없음)  
**Testing**: Vitest (기존 테스트 프레임워크 유지)  
**Target Platform**: Web (Next.js App Router)  
**Project Type**: Web application (Next.js App Router 기반)  
**Performance Goals**: 검색 입력 시 1초 이내 필터링 결과 표시, 대용량 데이터(1000+ 종목)에서도 부드러운 UX  
**Constraints**: 기존 필터 기능과 호환, 서버 사이드 필터링 없이 클라이언트 사이드만 처리  
**Scale/Scope**: 검색 인풋 컴포넌트 추가 및 클라이언트 사이드 필터링 로직

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- ✅ 기존 프로젝트 구조 활용 (새 프로젝트 생성 불필요)
- ✅ 기존 기술 스택 유지 (Next.js, React, TypeScript)
- ✅ 기존 UI 컴포넌트 활용 (shadcn/ui Input 컴포넌트)
- ✅ 클라이언트 사이드 필터링으로 서버 부하 없음

## Project Structure

### Documentation (this feature)

```text
specs/ticker-search-filter/
├── plan.md              # This file
├── spec.md             # Feature specification
└── tasks.md             # Task list (to be generated)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── screener/
│       └── golden-cross/
│           └── GoldenCrossClient.tsx    # 검색 인풋 추가 및 필터링 로직
├── components/
│   └── ui/
│       └── input.tsx                     # shadcn/ui Input 컴포넌트 (이미 존재)
└── lib/
    └── filter-summary.ts                 # FilterState 타입 확장 (선택적)
```

## Implementation Approach

### Phase 1: 검색 인풋 UI 추가

- `GoldenCrossClient.tsx`에 검색 인풋 컴포넌트 추가
- 적절한 위치에 배치 (필터박스 위 또는 아래)
- shadcn/ui Input 컴포넌트 사용
- 플레이스홀더 텍스트 설정 (예: "티커 검색...")

### Phase 2: 클라이언트 사이드 필터링 로직

- 검색어 상태 관리 (useState 또는 useQueryState)
- 검색어로 심볼 필터링 함수 구현
- 대소문자 구분 없이 부분 일치 검색
- 빈 문자열일 때 모든 종목 표시

### Phase 3: 다른 필터와 통합

- 기존 필터(이평선, 성장성, 수익성)와 AND 조건으로 동작
- 필터링된 데이터를 테이블에 표시
- 검색 결과가 없을 때 메시지 표시

### Phase 4: UX 개선 및 최적화

- 검색 인풋에 아이콘 추가 (Search 아이콘, lucide-react)
- Debounce 적용 (300ms)
- useDeferredValue를 사용한 필터링 우선순위 조정
- startTransition을 사용한 상태 업데이트 최적화
- 검색 중 스켈레톤 표시 방지 (서버 필터 변경 중에만 표시)
- 검색 인풋 위치 최적화 (필터 라인 오른쪽 끝, 높이 h-12, 너비 w-[200px])

## Key Technical Decisions

### 1. 클라이언트 사이드 필터링

**Decision**: 서버 사이드 필터링 대신 클라이언트 사이드 필터링 사용

**Rationale**:
- 즉각적인 반응성 (서버 요청 없음)
- 서버 부하 감소
- 기존 API 구조 변경 불필요
- 검색어가 짧을 때도 실시간 필터링 가능

**Trade-offs**:
- 대량의 데이터(10000+ 종목)에서는 성능 저하 가능
- 하지만 현재 스크리너는 이미 필터링된 결과만 표시하므로 문제 없음

### 2. 검색 인풋 위치

**Decision**: 필터박스 라인 오른쪽 끝에 배치, 높이 h-12로 맞춤

**Rationale**:
- 필터박스와 같은 라인에 배치하여 시각적 일관성 유지
- 오른쪽 끝에 배치하여 필터 설정 후 검색하는 자연스러운 흐름
- 높이를 h-12로 맞춰 다른 필터박스와 정렬
- 너비를 w-[200px]로 고정하여 적절한 크기 유지

### 3. URL 쿼리 파라미터 포함 여부

**Decision**: 클라이언트 상태로 유지 (현재 구현)

**Rationale**:
- 검색어는 주로 일시적인 탐색에 사용되므로 URL에 필수로 포함할 필요 없음
- 클라이언트 상태로 유지하여 빠른 반응성 제공
- 추후 공유 기능이 중요해지면 useQueryState로 쉽게 전환 가능

### 4. 성능 최적화

**Decision**: Debounce(300ms) + useDeferredValue + startTransition 조합 사용

**Rationale**:
- Debounce: 불필요한 필터링 호출 감소
- useDeferredValue: 필터링 작업의 우선순위를 낮춰 입력 반응성 유지
- startTransition: 상태 업데이트를 transition으로 처리하여 UI 블로킹 방지
- 입력값(`tickerSearchInput`)과 실제 검색값(`tickerSearch`) 분리하여 즉각적인 입력 반응성 제공

## Dependencies

### External Dependencies

- shadcn/ui Input 컴포넌트 (이미 존재)
- nuqs (이미 사용 중, URL 파라미터 관리용)

### Internal Dependencies

- `GoldenCrossClient.tsx`: 메인 컴포넌트
- `GoldenCrossCompany` 타입: 종목 데이터 구조

## Risks & Mitigations

### Risk 1: 대량 데이터에서 성능 저하

**Mitigation**: 
- 현재 스크리너는 이미 서버에서 필터링된 결과만 받아오므로 데이터 양이 제한적
- Debounce(300ms) 적용으로 불필요한 필터링 호출 감소
- useDeferredValue로 필터링 작업의 우선순위를 낮춰 입력 반응성 유지
- useMemo로 필터링된 데이터의 불필요한 재계산 방지

### Risk 2: 다른 필터와의 충돌

**Mitigation**:
- AND 조건으로 명확히 정의
- 테스트 케이스 작성

## Success Metrics

- 검색 입력 시 1초 이내 필터링 결과 표시
- 대소문자 구분 없이 정상 작동
- 빈 문자열일 때 모든 종목 표시
- 다른 필터와 함께 사용 시 정상 작동

