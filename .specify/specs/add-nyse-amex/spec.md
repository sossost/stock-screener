# Feature Specification: NYSE, AMEX 거래소 추가

**Feature Branch**: `feature/add-nyse-amex`  
**Created**: 2025-11-29  
**Status**: Completed

## Overview

기존 NASDAQ만 지원하던 심볼 ETL을 확장하여 NYSE, AMEX 거래소도 포함.

### 배경

- 사용자가 BMNR(AMEX 거래소) 티커를 조회했으나 DB에 없음
- 현재 ETL이 NASDAQ 거래소만 필터링하고 있었음

---

## Goals

1. NYSE 거래소 심볼 추가
2. AMEX 거래소 심볼 추가
3. 기존 필터링 로직 유지 (워런트, ETF, 펀드 제외)

---

## Non-Goals

- 해외 거래소 추가 (별도 피쳐)
- OTC 마켓 추가 (기존 allowOTC 파라미터로 제어)

---

## Changes

### Before

```typescript
// NASDAQ만 조회
fetchJson(`${API}/company-screener?exchange=NASDAQ&limit=10000&apikey=${KEY}`)

// NASDAQ만 필터링
.filter((r) => r.exchange === "NASDAQ" || r.exchangeShortName === "NASDAQ")
```

### After

```typescript
// NASDAQ, NYSE, AMEX 병렬 조회
const SUPPORTED_EXCHANGES = ["NASDAQ", "NYSE", "AMEX"];

const results = await Promise.all(
  SUPPORTED_EXCHANGES.map((exchange) =>
    fetchJson(`${API}/company-screener?exchange=${exchange}&limit=10000&apikey=${KEY}`)
  )
);
const allSymbols = results.flat();

// 지원 거래소 필터링
.filter((r) => SUPPORTED_EXCHANGES.includes(r.exchangeShortName || ""))
```

### 파일 변경

- `load-nasdaq-symbols.ts` → `load-us-symbols.ts` 리네이밍
- `loadNasdaqSymbols` → `loadUSSymbols` export 이름 변경
- 순차 API 호출 → `Promise.all` 병렬 호출

---

## Results

| 항목 | Before | After |
|------|--------|-------|
| 지원 거래소 | NASDAQ | NASDAQ, NYSE, AMEX |
| 심볼 수 | 4,301 | 7,119 |

---

## Success Criteria

- [x] NYSE 심볼 DB에 저장됨
- [x] AMEX 심볼 DB에 저장됨 (BMNR 포함)
- [x] 기존 NASDAQ 심볼 유지
- [x] 워런트/ETF/펀드 제외 로직 유지
- [x] lint/test/build 통과

