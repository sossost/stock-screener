# Feature Specification: 매매일지 페이지 성능 개선

**Feature Branch**: `feature/trades-page-performance`  
**Created**: 2025-12-05  
**Status**: ✅ Completed

## Overview

매매일지 페이지 첫 접속 시 페이지 전환이 느린 문제를 해결. Suspense 추가로 로딩 상태 표시, 쿼리 최적화로 데이터 조회 성능 개선.

### 문제 상황

- 페이지 첫 접속 후 매매일지 탭 이동 시 페이지 전환 지연
- 서버에서 모든 데이터를 가져올 때까지 블로킹 (Suspense 없음)
- 전일 가격 조회 쿼리 비효율 (중첩 서브쿼리 사용)

### 목표

1. **사용자 경험 개선**: 로딩 상태 표시로 피드백 제공
2. **성능 개선**: 쿼리 최적화로 데이터 조회 시간 단축
3. **프로젝트 패턴 준수**: 다른 페이지들과 동일한 Suspense 패턴 적용

---

## 개선 사항

### 1. Suspense 추가

**현재 상태**: `apps/web/src/app/trades/page.tsx`에 Suspense 없음 → 서버에서 모든 데이터를 가져올 때까지 블로킹

**개선 방안**:
- Suspense로 감싸서 로딩 상태 표시
- 로딩 스켈레톤 컴포넌트 추가 (프로젝트 패턴 따름)
- `stats/page.tsx`와 동일한 패턴 적용

**참고 패턴**:
```typescript
// apps/web/src/app/trades/stats/page.tsx
<Suspense fallback={<LoadingSkeleton />}>
  <StatsClient />
</Suspense>
```

### 2. 쿼리 최적화

**현재 상태**: `getTradesList`에서 최신 가격과 전일 가격을 2번의 쿼리로 조회, 전일 가격 쿼리가 중첩 서브쿼리로 비효율적

**개선 방안**:
- 윈도우 함수(`ROW_NUMBER()`)로 한 번의 쿼리로 최신 가격과 전일 가격 조회
- 중첩 서브쿼리 제거로 쿼리 성능 개선

**현재 쿼리**:
```sql
-- 최신 가격 조회
SELECT ... FROM daily_prices WHERE (symbol, date) IN (SELECT symbol, MAX(date) ...)

-- 전일 가격 조회 (비효율적)
SELECT ... FROM daily_prices WHERE (symbol, date) IN (
  SELECT symbol, MAX(date) FROM daily_prices 
  WHERE date < (SELECT MAX(date) FROM daily_prices WHERE symbol = ...)
  ...
)
```

**최적화된 쿼리**:
```sql
WITH ranked_prices AS (
  SELECT
    symbol,
    close,
    date,
    ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY date DESC) AS rn
  FROM daily_prices
  WHERE symbol IN (...)
)
SELECT
  symbol,
  MAX(CASE WHEN rn = 1 THEN close END) AS latest_close,
  MAX(CASE WHEN rn = 2 THEN close END) AS prev_close
FROM ranked_prices
WHERE rn <= 2
GROUP BY symbol
```

---

## 기술적 세부사항

### 파일 변경

1. **`apps/web/src/app/trades/page.tsx`**
   - Suspense 추가
   - 로딩 스켈레톤 컴포넌트 추가

2. **`apps/web/src/lib/trades/queries.ts`**
   - `getTradesList` 함수의 가격 조회 로직 최적화
   - 윈도우 함수 사용으로 쿼리 통합

### 성능 기대 효과

- **쿼리 실행 시간**: 2번의 쿼리 → 1번의 쿼리로 감소
- **서버 응답 시간**: 중첩 서브쿼리 제거로 쿼리 실행 시간 단축
- **사용자 경험**: Suspense로 즉시 로딩 상태 표시

---

## 테스트 전략

### 단위 테스트

- `getTradesList` 함수의 쿼리 최적화 테스트
- 윈도우 함수를 사용한 가격 조회 로직 테스트

### 통합 테스트

- Suspense가 올바르게 작동하는지 확인
- 로딩 스켈레톤이 표시되는지 확인
- 최적화된 쿼리가 올바른 데이터를 반환하는지 확인

---

## 관련 문서

- [프론트엔드 품질 원칙](../docs/FRONTEND_PRACTICES.md)
- [코드 리뷰 체크리스트](../docs/CODE_REVIEW_CHECKLIST.md)
- [피쳐 개발 워크플로우](../docs/FEATURE_DEVELOPMENT_WORKFLOW.md)

