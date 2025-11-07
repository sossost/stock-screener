# Implementation Plan: 통합 스크리너 리팩토링

**Branch**: `feature/unified-screener-refactor` | **Date**: 2025-11-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/unified-screener-refactor/spec.md`

## Summary

현재 여러 스크리너 페이지로 분리되어 있는 구조를 단순화하여, 골든크로스 스크리너를 메인 페이지로 이동하고 Golden Cross 조건을 선택 가능한 필터로 분리합니다. Rule of 40와 Turn-Around 스크리너의 UI와 라우트는 제거하되, 핵심 로직은 보존하여 추후 리뉴얼 시 재사용할 수 있도록 합니다.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 15, React 19  
**Primary Dependencies**: Next.js, React, nuqs (URL state management), Drizzle ORM, PostgreSQL  
**Storage**: PostgreSQL (기존 데이터베이스 유지)  
**Testing**: Vitest (기존 테스트 프레임워크 유지)  
**Target Platform**: Web (Next.js App Router)  
**Project Type**: Web application (Next.js App Router 기반)  
**Performance Goals**: 페이지 로드 시간 < 1초, 필터 변경 시 응답 시간 < 2초  
**Constraints**: 기존 API 성능 유지, 기존 필터 기능 모두 유지  
**Scale/Scope**: 단일 페이지 리팩토링, 기존 기능 유지

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ 기존 프로젝트 구조 활용 (새 프로젝트 생성 불필요)
- ✅ 기존 기술 스택 유지 (Next.js, React, TypeScript)
- ✅ 기존 데이터베이스 스키마 유지 (변경 불필요)

## Project Structure

### Documentation (this feature)

```text
specs/unified-screener-refactor/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task list (to be generated)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── page.tsx                    # 메인 페이지 (골든크로스 스크리너로 변경)
│   ├── screener/
│   │   ├── golden-cross/           # 기존 유지 (리다이렉트용)
│   │   ├── rule-of-40/             # UI 제거, 핵심 로직 보존
│   │   └── turn-around/             # UI 제거, 핵심 로직 보존
│   └── api/
│       └── screener/
│           ├── golden-cross/       # goldenCross 파라미터 추가
│           ├── rule-of-40/         # 보존 (추후 리뉴얼용)
│           └── turned-profitable/   # 보존 (추후 리뉴얼용)
├── components/
│   ├── filters/
│   │   └── GrowthFilterControls.tsx  # 기존 유지
│   └── navigation.tsx               # 기존 유지
└── types/
    └── golden-cross.ts              # goldenCross 필터 타입 추가
```

**Structure Decision**: 기존 Next.js App Router 구조를 유지하며, 메인 페이지를 골든크로스 스크리너로 변경하고, 불필요한 UI만 제거합니다.

## Implementation Approach

### Phase 1: 메인 페이지 리팩토링
- `src/app/page.tsx`를 골든크로스 스크리너로 변경
- 기존 `/screener/golden-cross` 페이지 내용을 메인 페이지로 이동
- 메인 페이지의 스크리너 선택 UI 제거

### Phase 2: Golden Cross 필터 추가
- API 엔드포인트에 `goldenCross` 파라미터 추가
- SQL 쿼리에서 Golden Cross 조건을 선택적으로 적용
- 프론트엔드에 Golden Cross 필터 UI 추가
- "최근 전환" 옵션은 Golden Cross 필터가 활성화된 경우에만 사용 가능

### Phase 3: 불필요한 UI 제거
- Rule of 40와 Turn-Around 페이지 UI 제거
- 메인 페이지의 스크리너 선택 카드 제거
- API 엔드포인트는 보존 (추후 리뉴얼용)

### Phase 4: URL 호환성
- `/screener/golden-cross` 경로를 메인 페이지로 리다이렉트
- 기존 URL 파라미터 호환성 유지

## Key Technical Decisions

1. **API 엔드포인트 유지**: Rule of 40와 Turn-Around API는 보존하여 추후 리뉴얼 시 재사용
2. **URL 상태 관리**: `nuqs` 라이브러리를 사용하여 필터 상태를 URL에 저장 (기존 방식 유지)
3. **기본값 설정**: `goldenCross=true`를 기본값으로 설정하여 기존 동작과 일치
4. **점진적 마이그레이션**: 기존 `/screener/golden-cross` 경로는 리다이렉트로 호환성 유지

## Complexity Tracking

> **No violations detected** - 기존 구조를 활용한 단순 리팩토링

