# Implementation Plan: NYSE, AMEX 거래소 추가

**Feature Branch**: `feature/add-nyse-amex`  
**Spec Version**: 1.0  
**Created**: 2025-11-29  
**Status**: Completed

---

## Constitution Check

| 항목 | 체크 | 비고 |
|------|------|------|
| 기존 DB 스키마 영향 | ✅ 없음 | symbols 테이블 구조 변경 없음 |
| 새 테이블 추가 | ✅ 없음 | - |
| 외부 API 의존성 | ✅ 기존 | FMP API 동일 |
| Breaking Changes | ✅ 없음 | 추가만 함 |

---

## Key Technical Decisions

### 1. 거래소별 개별 API 호출

**결정**: 각 거래소별로 API를 개별 호출하여 심볼 수집

```typescript
const SUPPORTED_EXCHANGES = ["NASDAQ", "NYSE", "AMEX"];

for (const exchange of SUPPORTED_EXCHANGES) {
  const list = await fetchJson(
    `${API}/company-screener?exchange=${exchange}&limit=10000&apikey=${KEY}`
  );
  allSymbols.push(...list);
}
```

**이유**: FMP API가 단일 거래소별로 조회를 지원하므로 개별 호출 후 병합

### 2. 기존 필터링 로직 유지

**결정**: 워런트, ETF, 펀드 제외 로직 그대로 유지

```typescript
.filter((r) => SUPPORTED_EXCHANGES.includes(r.exchangeShortName || ""))
.filter((r) => {
  return (
    /^[A-Z]{1,5}$/.test(symbol) &&
    !symbol.endsWith("W") &&
    !r.isEtf &&
    !r.isFund
  );
});
```

---

## Risk Assessment

| 리스크 | 영향도 | 대응 |
|--------|--------|------|
| API 호출 증가 (3배) | 낮음 | ETL은 일 1회만 실행 |
| 심볼 수 증가로 인한 DB 부하 | 낮음 | 7119개는 충분히 처리 가능 |

---

## Milestones

| 마일스톤 | 상태 | 산출물 |
|----------|------|--------|
| M1: 스펙 확정 | ✅ | spec.md, plan.md, tasks.md |
| M2: ETL 수정 | ✅ | load-nasdaq-symbols.ts |
| M3: 테스트 | ✅ | lint/test/build 통과 |
| M4: 문서화 | ✅ | README 업데이트 |

