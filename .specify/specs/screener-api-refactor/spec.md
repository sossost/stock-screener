# Feature Specification: 스크리너 API 리팩토링

**Feature Branch**: `feature/screener-api-refactor`  
**Created**: 2025-11-29  
**Status**: Completed

## Overview

현재 `/api/screener/golden-cross` API가 이름과 다르게 종합 스크리너 역할을 하고 있음. 500줄+ 쿼리가 하나의 파일에 있어 유지보수가 어려움. API 리네이밍 및 쿼리 모듈화 필요.

### 현재 문제점

| 문제          | 설명                                                            |
| ------------- | --------------------------------------------------------------- |
| 이름 불일치   | `golden-cross`이지만 실제로는 정배열/성장성/수익성 등 종합 필터 |
| 거대 쿼리     | 500줄+ SQL이 하나의 파일에 있음                                 |
| 타입 불일치   | `text`/`date` 캐스팅 이슈 (수정됨)                              |
| 중복 로직     | `rule-of-40`, `turned-profitable` API와 중복                    |
| 테스트 어려움 | 쿼리가 너무 커서 단위 테스트 어려움                             |

---

## Goals

1. **API 리네이밍**: `/api/screener/golden-cross` → `/api/screener/stocks`
2. **쿼리 모듈화**: 거대 SQL을 작은 함수들로 분리
3. **중복 제거**: 공통 쿼리 빌더 추출
4. **타입 정리**: `types/golden-cross.ts` → `types/screener.ts`

---

## Non-Goals

- 새로운 필터 추가 (별도 피쳐)
- 프론트엔드 변경 최소화 (API 응답 구조 유지)

---

## Architecture

### Before (현재)

```
/api/screener/
├── golden-cross/route.ts   # 500줄+ 거대 쿼리
├── rule-of-40/route.ts     # 중복 로직
└── turned-profitable/route.ts
```

### After (목표)

```
/api/screener/
├── stocks/route.ts         # 메인 엔드포인트
├── rule-of-40/route.ts
└── turned-profitable/route.ts

/lib/screener/
├── query-builder.ts        # SQL 쿼리 빌더
└── types.ts                # 공통 타입

/types/
└── screener.ts             # 스크리너 타입 (기존 golden-cross.ts)
```

---

## Requirements

### Functional Requirements

- **FR-001**: `/api/screener/stocks` 엔드포인트 생성
- **FR-002**: 기존 `golden-cross` 쿼리를 모듈화
- **FR-003**: 기존 `golden-cross` API 삭제
- **FR-004**: 타입 파일 리네이밍 (`golden-cross.ts` → `screener.ts`)
- **FR-005**: 단위 테스트 작성

### Non-Functional Requirements

- **NFR-001**: 응답 시간 기존 대비 동일 또는 개선
- **NFR-002**: 코드 라인 수 50% 이상 감소 (메인 API 파일 기준)

---

## Implementation Phases

| Phase   | 범위                                  | 예상 작업량 |
| ------- | ------------------------------------- | ----------- |
| Phase 1 | 쿼리 모듈화 (`/lib/screener/*`)       | 중          |
| Phase 2 | 새 API 생성 (`/api/screener/stocks`)  | 소          |
| Phase 3 | 기존 API 리다이렉트 + deprecated 마킹 | 소          |
| Phase 4 | 테스트 작성 + 문서화                  | 중          |

---

## Success Criteria

- [x] `/api/screener/stocks` 정상 동작
- [x] 기존 `golden-cross` API 및 타입 파일 삭제
- [x] 단위 테스트 통과
- [x] 빌드 통과
