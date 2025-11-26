# Implementation Plan: 테이블에 섹터 컬럼 추가

**Branch**: `feature/table-sector-column` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/table-sector-column/spec.md`

## Summary

스크리너 테이블에 섹터 정보를 추가하고 섹터 기준 정렬(및 필요 시 필터)을 지원한다. `symbols.sector`에 이미 적재된 값을 Golden Cross API 응답에 포함해 프론트 테이블에 노출하며, 기존 기본 정렬/필터 UX는 유지한다. 스키마 변경 없이 API/타입/컴포넌트 확장만으로 완료한다.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 15, React 19  
**Primary Dependencies**: Next.js App Router, Drizzle ORM, PostgreSQL  
**Storage**: PostgreSQL (`symbols.sector` 활용, 추가 마이그레이션 없음)  
**Testing**: Vitest + Testing Library (기존 스택 유지)  
**Target Platform**: Web (Next.js App Router)  
**Project Type**: Web application  
**Performance Goals**: 기존 쿼리에 필드 추가로 응답 시간 영향 미미(< ~10ms 예상), 캐싱 정책 유지  
**Constraints**: 스키마/ETL 변경 없이 진행, 기본 정렬/필터 UX 유지, 캐싱 태그/쿼리 파라미터 계약 유지  
**Scale/Scope**: 테이블 컬럼 1개 추가 + 정렬 + (옵션) 필터

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- ✅ 기존 데이터 소스(`symbols.sector`) 재사용, 추가 마이그레이션 불필요
- ✅ 기존 Next.js/TypeScript/Drizzle 스택 유지
- ✅ 기존 스크리너 테이블/정렬 패턴 재사용
- ⚠️ 섹터 필터 다중 선택 여부는 확인 필요(명세 FR-006)

## Project Structure

### Documentation (this feature)

```text
specs/table-sector-column/
├── plan.md  # This file
├── spec.md  # Feature specification
└── tasks.md # Task list
```

### Source Code (repository root)

```text
apps/web/src/app/api/screener/golden-cross/route.ts   # API 응답에 sector 포함
apps/web/src/types/golden-cross.ts                    # 타입에 sector 추가
apps/web/src/components/screener/columns.ts           # 컬럼 정의/정렬 키 추가
apps/web/src/components/screener/StockTable.tsx       # 셀 렌더링/정렬 로직 확장
apps/web/src/app/(screener)/TableSkeleton.tsx         # 스켈레톤 컬럼 반영
# (필터 필요 시)
apps/web/src/lib/filters/schema.ts                    # 섹터 필터 파싱/쿼리 빌드
apps/web/src/components/filters/CategoryFilterDialog.tsx # 섹터 필터 UI
apps/web/src/hooks/useFilterState.ts                  # 필터 상태/쿼리 연동
```

## Key Technical Decisions

1) **데이터 소스**  
   - Decision: `symbols.sector`를 그대로 사용, 추가 ETL/마이그레이션 없음.  
   - Rationale: 이미 `load-nasdaq-symbols`에서 채워지며 null 허용. 추가 계산 필요 없음.

2) **정렬 동작**  
   - Decision: 섹터를 `SortKey`로 추가, 알파벳/한글 순 정렬. null/빈 문자열은 항상 뒤로 보냄.  
   - Rationale: 기존 문자열 정렬 패턴과 동일, UX 일관성.

3) **표시 방식**  
   - Decision: 섹터 컬럼 폭을 확보(예: 140~160px)하고 값 없으면 "-"로 표현. 줄바꿈 대신 텍스트 트렁케이션/툴팁 여부는 UI 확인 후 결정.  
   - Rationale: 긴 섹터명을 수용하면서 테이블 레이아웃을 깨뜨리지 않기 위함.

4) **섹터 필터(옵션)**  
   - Decision: 다중 선택 드롭다운 + 쿼리 파라미터 `sector`(comma-separated) 형태 검토.  
   - Rationale: 섹터별 비교 수요 대응. 단, 단일/다중 선택 여부는 이해관계자 확인 필요.

## Implementation Strategy

1. **API 확장**: `route.ts` 쿼리에 `s.sector` 선택 추가, 응답 `data` 매핑에 포함. 캐싱 태그/응답 스키마 그대로 유지.  
2. **타입 정비**: `GoldenCrossCompany`/`ScreenerCompany`에 `sector: string | null` 추가 후 관련 사용처 업데이트.  
3. **테이블 UI**: `screenerColumns`에 섹터 컬럼/정렬 키 추가, `StockTable` 정렬 스위치에 `sector` 케이스 추가, 셀 렌더링(값/“-”) 구현. 스켈레톤은 컬럼 배열 사용으로 자동 반영하되 폭/정렬 확인.  
4. **필터(필요 시)**: 필터 스키마/상태/쿼리 빌더에 섹터 추가, 필터 대화상자/요약 UI에 섹터 선택 추가, API 쿼리 파라미터 전달.  
5. **검증**: API 테스트에 `sector` 필드 검증 추가, UI 레벨에서 섹터 정렬/렌더링 확인. `yarn test` 실행.

## Risk Assessment

- **데이터 품질**: 일부 심볼의 섹터가 null/빈 문자열일 수 있음 → "-" 처리 및 정렬 시 뒤로 배치.
- **레이아웃**: 긴 섹터명으로 테이블 폭 증가 가능 → 폭 지정/텍스트 트렁케이션으로 완화.
- **필터 요구 불확실**: 단일/다중 선택 요구 미확인 → 구현 전 옵션 확정 필요.

## Dependencies

- `symbols` 테이블/ETL(`load-nasdaq-symbols`)에 섹터 데이터가 채워져 있어야 함.
- 기존 스크리너 정렬/필터 훅(`useFilterState`, `useFilterActions`) 구조 유지.
- 캐싱/빌드 파이프라인(`CACHE_DURATION`, ISR) 변경 없음.

## Testing Strategy

- **Unit/Contract**: `apps/web/src/app/api/screener/golden-cross/__tests__/route.test.ts`에 `sector` 필드 포함 검증 추가.  
- **Component**: (필요 시) `StockTable` 렌더링/정렬 스냅샷 또는 정렬 로직 테스트 추가.  
- **Integration/Manual**: 스크리너 페이지에서 섹터 컬럼 표시/정렬 동작 확인, 필터 적용 시 결과 검증.  
- **Regression**: 기존 기본 정렬/필터/검색, 빌드(`yarn build` 필요 시)와 `yarn test` 전부 통과.
