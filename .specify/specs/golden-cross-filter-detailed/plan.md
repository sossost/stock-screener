# Implementation Plan: 골든크로스 필터 세분화 및 UX 개선

**Branch**: `feature/golden-cross-filter-detailed` | **Date**: 2025-11-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/golden-cross-filter-detailed/spec.md`

## Summary

이평선 정배열(MA20 > MA50 > MA100 > MA200) 여부를 토글식으로 선택할 수 있도록 하고, 골든크로스(MA50 > MA200) 조건을 별도 필터로 분리합니다. 또한 필터 UI를 필터박스 형태로 개선하여 현재 적용된 필터를 한눈에 확인하고, 팝업으로 상세 설정을 할 수 있도록 합니다.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 15, React 19  
**Primary Dependencies**: Next.js, React, nuqs (URL state management), Drizzle ORM, PostgreSQL, Shadcn/ui (Dialog 컴포넌트)  
**Storage**: PostgreSQL (기존 데이터베이스 유지)  
**Testing**: Vitest (기존 테스트 프레임워크 유지)  
**Target Platform**: Web (Next.js App Router)  
**Project Type**: Web application (Next.js App Router 기반)  
**Performance Goals**: 필터 변경 시 응답 시간 < 2초, 팝업 열기/닫기 < 0.5초  
**Constraints**: 기존 API 성능 유지, 기존 필터 기능 모두 유지  
**Scale/Scope**: 필터 로직 확장 및 UI 개선

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- ✅ 기존 프로젝트 구조 활용 (새 프로젝트 생성 불필요)
- ✅ 기존 기술 스택 유지 (Next.js, React, TypeScript)
- ✅ 기존 데이터베이스 스키마 유지 (변경 불필요)
- ✅ Shadcn/ui Dialog 컴포넌트 활용 (기존 UI 라이브러리 활용)

## Project Structure

### Documentation (this feature)

```text
specs/golden-cross-filter-detailed/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task list (to be generated)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── page.tsx                    # 메인 페이지 (필터박스 UI 추가)
│   └── api/
│       └── screener/
│           └── golden-cross/       # 이평선 필터 파라미터 추가
├── components/
│   ├── filters/
│   │   ├── FilterBox.tsx           # 필터박스 컴포넌트 (신규)
│   │   ├── FilterDialog.tsx        # 필터 설정 팝업 컴포넌트 (신규)
│   │   └── GrowthFilterControls.tsx  # 기존 유지
│   └── ui/
│       └── dialog.tsx              # Shadcn/ui Dialog (기존)
└── types/
    └── golden-cross.ts              # 필터 타입 확장
```

**Structure Decision**: 기존 Next.js App Router 구조를 유지하며, 필터 컴포넌트를 모듈화하고 팝업 UI를 추가합니다.

## Implementation Approach

### Phase 1: API 엔드포인트 확장

- API 엔드포인트에 각 이평선 필터 파라미터 추가 (`ma20`, `ma50`, `ma100`, `goldenCross`)
- SQL 쿼리에서 각 이평선 조건을 선택적으로 적용
- 기존 `goldenCross` 파라미터를 새로운 필터 구조로 마이그레이션

### Phase 2: 필터 타입 및 상태 관리

- 필터 타입 정의 확장 (`MAFilterState`, `GoldenCrossFilterState`)
- URL 쿼리 파라미터 관리 (`nuqs` 사용)
- 필터 상태 요약 로직 구현

### Phase 3: 필터 UI 컴포넌트 구현

- `FilterBox` 컴포넌트: 현재 적용된 필터 요약 표시
- `FilterDialog` 컴포넌트: 필터 설정 팝업
- `MAFilterControls` 컴포넌트: 이평선 필터 컨트롤
- 기존 필터 컴포넌트들을 팝업 내부로 이동

### Phase 4: 통합 및 테스트

- 메인 페이지에 필터박스 및 팝업 통합
- 필터 상태 동기화 확인
- URL 파라미터 호환성 확인

## Key Technical Decisions

1. **필터 파라미터 구조**: 정배열(`ordered`)과 골든크로스(`goldenCross`)를 각각 boolean 파라미터로 관리
2. **SQL 쿼리 조건부 적용**: 각 필터 파라미터에 따라 SQL 조건을 동적으로 추가
3. **UI 컴포넌트 분리**: 필터박스와 팝업을 별도 컴포넌트로 분리하여 재사용성 향상
4. **Shadcn/ui Dialog 활용**: 기존 UI 라이브러리의 Dialog 컴포넌트를 사용하여 일관된 UI 제공
5. **필터 요약 로직**: 활성화된 필터를 텍스트로 요약하여 필터박스에 표시

## Data Models

### API Request Parameters

```typescript
interface GoldenCrossQueryParams {
  // 이평선 필터
  ordered?: boolean; // MA20 > MA50 > MA100 > MA200 정배열 조건 적용 여부
  goldenCross?: boolean; // MA50 > MA200 조건 적용 여부

  // 기존 필터들
  justTurned?: boolean;
  lookbackDays?: number;
  profitability?: "all" | "profitable" | "unprofitable";
  revenueGrowth?: boolean;
  revenueGrowthQuarters?: number;
  revenueGrowthRate?: number;
  incomeGrowth?: boolean;
  incomeGrowthQuarters?: number;
  incomeGrowthRate?: number;
}
```

### Filter State Type

```typescript
interface MAFilterState {
  ordered: boolean; // MA20 > MA50 > MA100 > MA200 정배열
  goldenCross: boolean; // MA50 > MA200
}

interface FilterSummary {
  activeFilters: string[];
  count: number;
  summaryText: string;
}
```

### SQL Query Logic

```sql
-- 정배열 조건과 골든크로스 조건을 선택적으로 적용
WHERE 1=1
  ${ordered ? sql`AND dm.ma20 > dm.ma50 AND dm.ma50 > dm.ma100 AND dm.ma100 > dm.ma200` : sql``}
  ${goldenCross ? sql`AND dm.ma50 > dm.ma200` : sql``}
```

## Complexity Tracking

> **No violations detected** - 기존 구조를 활용한 확장 작업
