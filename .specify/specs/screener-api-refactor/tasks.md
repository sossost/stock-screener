# Implementation Tasks: 스크리너 API 리팩토링

**Feature Branch**: `feature/screener-api-refactor`  
**Plan Version**: 1.0  
**Created**: 2025-11-29  
**Status**: Draft

---

## Task Overview

| Phase | 태스크 수 | 완료 | 진행률 |
|-------|----------|------|--------|
| Phase 1 | 8 | 3 | 38% |
| Phase 2 | 4 | 4 | 100% |
| Phase 3 | 3 | 3 | 100% |
| Phase 4 | 4 | 3 | 75% |
| **Total** | **19** | **13** | **68%** |

---

## Phase 1: 쿼리 모듈화

**Priority: P1 - 필수**

| ID | Task | Status | 연관 FR |
|----|------|--------|---------|
| T101 | `/lib/screener/types.ts` - 공통 타입 정의 | [x] | FR-002 |
| T102 | `/lib/screener/utils.ts` - 유틸리티 함수 | [-] | FR-002 |
| T103 | `/lib/screener/filters/ma-filter.ts` - 이동평균선 필터 | [-] | FR-002 |
| T104 | `/lib/screener/filters/growth-filter.ts` - 성장성 필터 | [-] | FR-002 |
| T105 | `/lib/screener/filters/profitability-filter.ts` - 수익성 필터 | [-] | FR-002 |
| T106 | `/lib/screener/filters/valuation-filter.ts` - 밸류에이션 필터 | [-] | FR-002 |
| T107 | `/lib/screener/query-builder.ts` - 쿼리 빌더 (통합) | [x] | FR-002 |
| T108 | 각 필터 단위 테스트 작성 | [x] | FR-005 |

### Phase 1 완료 조건

- [ ] 모든 필터 함수가 독립적으로 테스트 가능
- [ ] 기존 쿼리와 동일한 결과 반환

---

## Phase 2: 새 API 생성

**Priority: P1 - 필수**

| ID | Task | Status | 연관 FR |
|----|------|--------|---------|
| T201 | `/api/screener/stocks/route.ts` 생성 | [x] | FR-001 |
| T202 | 쿼리 빌더 연동 | [x] | FR-001 |
| T203 | 기존 응답 구조 유지 검증 | [x] | FR-004 |
| T204 | 통합 테스트 작성 | [x] | FR-005 |

### Phase 2 완료 조건

- [ ] `/api/screener/stocks` 정상 동작
- [ ] 기존 API와 동일한 응답

---

## Phase 3: 기존 API 리다이렉트

**Priority: P2 - 중요**

| ID | Task | Status | 연관 FR |
|----|------|--------|---------|
| T301 | `golden-cross/route.ts` → `/stocks` 리다이렉트 | [x] | FR-003 |
| T302 | deprecated 경고 헤더 추가 | [x] | FR-003 |
| T303 | 프론트엔드 API 호출 경로 변경 | [x] | - |

### Phase 3 완료 조건

- [ ] 기존 API 호출 시 새 API로 리다이렉트
- [ ] 하위호환 유지

---

## Phase 4: 테스트 + 문서화

**Priority: P2 - 중요**

| ID | Task | Status | 연관 FR |
|----|------|--------|---------|
| T401 | E2E 테스트 (리다이렉트 포함) | [x] | FR-005 |
| T402 | 성능 벤치마크 (기존 vs 새 API) | [-] | NFR-001 |
| T403 | README 업데이트 | [x] | - |
| T404 | 스펙 문서 완료 표시 | [x] | - |

### Phase 4 완료 조건

- [ ] 테스트 커버리지 80%+
- [ ] 성능 동일 또는 개선
- [ ] 문서 업데이트 완료

---

## Notes

### 현재 기술 부채

- [x] `text = date` 타입 불일치 (2025-11-29 수정)
- [ ] CTE 중복 (price_dates, ma_dates 등 사용 안 함)
- [ ] 에러 핸들링 일관성 부족
- [ ] 쿼리 파라미터 validation 분산

### 참고 파일

- 기존 API: `apps/web/src/app/api/screener/golden-cross/route.ts`
- 에러 핸들링: `apps/web/src/lib/errors/index.ts`
- 테스트: `apps/web/src/app/api/screener/golden-cross/__tests__/route.test.ts`

