# Implementation Plan: 스크리너 API 리팩토링

**Feature Branch**: `feature/screener-api-refactor`  
**Spec Version**: 1.0  
**Created**: 2025-11-29  
**Status**: Draft

---

## Constitution Check

| 항목 | 체크 | 비고 |
|------|------|------|
| 기존 DB 스키마 영향 | ✅ 없음 | 쿼리만 리팩토링 |
| 새 테이블 추가 | ✅ 없음 | - |
| 외부 API 의존성 | ✅ 없음 | - |
| 기존 컴포넌트 재사용 | ✅ | 프론트 변경 최소화 |
| Breaking Changes | ⚠️ | API 경로 변경 (리다이렉트로 호환) |

---

## Key Technical Decisions

### 1. 쿼리 빌더 패턴

**결정**: SQL 템플릿 리터럴을 함수 조합으로 분리

```typescript
// Before: 500줄 하드코딩
const rows = await db.execute(sql`WITH ... 매우 긴 쿼리 ...`);

// After: 함수 조합
const query = buildScreenerQuery({
  filters: {
    ma: buildMAFilter({ ordered, goldenCross }),
    growth: buildGrowthFilter({ revenueGrowth, incomeGrowth }),
    profitability: buildProfitabilityFilter({ profitability }),
    valuation: buildValuationFilter({ pegFilter }),
  },
  sort: { field: 'market_cap', order: 'DESC' },
});
const rows = await db.execute(query);
```

### 2. CTE 분리 전략

각 CTE를 별도 함수로 추출:

| CTE | 함수 | 설명 |
|-----|------|------|
| `last_d` | `getLatestDate()` | 최신 거래일 |
| `cur` | `getCurrentDayData()` | 당일 데이터 |
| `candidates` | `applyBaseFilters()` | 기본 필터 적용 |
| `prev_ma` | `calculatePrevMA()` | 전일 이동평균 |
| `qf` | `getQuarterlyFinancials()` | 분기 재무 |
| `qr` | `getValuationRatios()` | 밸류에이션 |

### 3. 리다이렉트 전략

```typescript
// /api/screener/golden-cross/route.ts
export async function GET(req: Request) {
  const url = new URL(req.url);
  const newUrl = url.pathname.replace('/golden-cross', '/stocks') + url.search;
  
  // 307 Temporary Redirect (메서드 유지)
  return NextResponse.redirect(new URL(newUrl, url.origin), 307);
}
```

---

## Risk Assessment

| 리스크 | 영향도 | 대응 |
|--------|--------|------|
| 쿼리 성능 저하 | 중 | 벤치마크 테스트 필수 |
| 하위호환 깨짐 | 고 | 리다이렉트 + E2E 테스트 |
| 모듈화로 인한 버그 | 중 | 단위 테스트 필수 |

---

## Milestones

| 마일스톤 | 목표일 | 산출물 |
|----------|--------|--------|
| M1: 스펙 확정 | - | spec.md, plan.md, tasks.md |
| M2: 쿼리 모듈화 | - | /lib/screener/* |
| M3: 새 API | - | /api/screener/stocks |
| M4: 테스트 + 배포 | - | 테스트 통과 + PR 머지 |

