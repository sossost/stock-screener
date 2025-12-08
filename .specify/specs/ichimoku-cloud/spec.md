# Feature Specification: 일목균형표 (Ichimoku Cloud)

**Feature Branch**: `feature/ichimoku-cloud`  
**Created**: 2025-12-08  
**Status**: 🚧 In Progress

## Overview

종목 상세 페이지의 기술적 차트에 일목균형표 구름대(Cloud)를 추가. 후행스팬은 제외하고 전환선, 기준선, 선행스팬 A/B로 구성된 구름대만 표시.

### 목표

1. **일목균형표 구름대 표시**: 전환선, 기준선, 선행스팬 A/B로 구성된 구름대를 차트에 오버레이
2. **프론트엔드 계산**: ETL 없이 클라이언트에서 실시간 계산 (기존 RSI/MACD 패턴과 동일)
3. **성능 최적화**: `useMemo`로 계산 최적화, 사용자 체감 지연 최소화

---

## 일목균형표 구성 요소

### 표시할 요소

1. **전환선 (Tenkan-sen)**: 9일 고저 평균
   - 계산: `(9일 최고가 + 9일 최저가) / 2`
   - 표시: Line Series (주황색)

2. **기준선 (Kijun-sen)**: 26일 고저 평균
   - 계산: `(26일 최고가 + 26일 최저가) / 2`
   - 표시: Line Series (파란색)

3. **선행스팬 A (Senkou Span A)**: (전환선 + 기준선) / 2, 26일 앞으로 이동
   - 계산: `(전환선 + 기준선) / 2`
   - 시간 이동: 현재 날짜에서 26일 앞으로 이동
   - 표시: 구름대 상단 경계 (Area Series)

4. **선행스팬 B (Senkou Span B)**: 52일 고저 평균, 26일 앞으로 이동
   - 계산: `(52일 최고가 + 52일 최저가) / 2`
   - 시간 이동: 현재 날짜에서 26일 앞으로 이동
   - 표시: 구름대 하단 경계 (Area Series)

5. **구름대 (Cloud)**: 선행스팬 A와 B 사이 영역
   - 색상: 선행스팬 A > B면 초록색, A < B면 빨간색
   - 표시: Area Series (반투명)

### 제외할 요소

- **후행스팬 (Chikou Span)**: 종가를 26일 뒤로 이동 (표시하지 않음)

---

## 기술적 세부사항

### 계산 로직

**필요한 데이터**:
- `dailyPrices`: `high`, `low`, `close`, `date` (최소 52일 이상)

**계산 순서**:
1. 전환선 계산 (9일 고저 평균)
2. 기준선 계산 (26일 고저 평균)
3. 선행스팬 A 계산: `(전환선 + 기준선) / 2`
4. 선행스팬 B 계산 (52일 고저 평균)
5. 선행스팬 A/B를 26일 앞으로 시간 이동
6. 구름대 색상 결정: A > B면 초록, A < B면 빨간

**데이터 요구사항**:
- 최소 **52일 이상**의 가격 데이터 필요
- 데이터 부족 시 일목균형표 표시 안 함

### 차트 표시

**Lightweight Charts 시리즈**:
- 전환선: `LineSeries` (주황색, `#f97316`)
- 기준선: `LineSeries` (파란색, `#3b82f6`)
- 구름대: `AreaSeries` (선행스팬 A/B 사이, 반투명)
  - A > B: 초록색 (`#22c55e80`)
  - A < B: 빨간색 (`#ef444480`)

**레이어 순서** (하위 → 상위):
1. 캔들스틱
2. 구름대 (Area Series)
3. 전환선 (Line Series)
4. 기준선 (Line Series)
5. 이동평균선 (기존)

### 호버 데이터

**추가할 필드** (`HoverData` 인터페이스):
- `tenkanSen`: 전환선 값
- `kijunSen`: 기준선 값
- `senkouSpanA`: 선행스팬 A 값
- `senkouSpanB`: 선행스팬 B 값

---

## 파일 변경

### 신규 파일

1. **`apps/web/src/lib/technical-indicators.ts`**
   - `calculateIchimokuWithTime()` 함수 추가
   - 반환 타입: `IchimokuData[]`

2. **`apps/web/src/lib/__tests__/technical-indicators.test.ts`**
   - 일목균형표 계산 로직 단위 테스트

### 수정 파일

1. **`apps/web/src/components/stock-detail/TechnicalChart.tsx`**
   - `HoverData` 인터페이스에 일목균형표 필드 추가
   - `allIndicatorData`에 일목균형표 계산 추가
   - 차트에 전환선/기준선/구름대 시리즈 추가
   - 호버 데이터에 일목균형표 값 표시

---

## 성능 고려사항

### 계산 복잡도

- **데이터량**: 250-260일 (1Y 기간)
- **계산 횟수**: 약 1,000번의 산술 연산
- **예상 시간**: **1-3ms** (JavaScript)

### 렌더링 복잡도

- **추가 시리즈**: 3개 (전환선, 기준선, 구름대)
- **예상 시간**: **10-20ms** (Lightweight Charts)

### 최적화

- `useMemo`로 계산 결과 메모이제이션
- `priceData` 변경 시에만 재계산
- 초기 로드 시 약 **+15-25ms** 추가 (체감 어려움)

---

## 테스트 전략

### 단위 테스트

- `calculateIchimokuWithTime()` 함수 테스트
- 최소 데이터 요구사항 (52일) 검증
- 시간 이동 로직 검증 (26일 앞으로)
- 구름대 색상 결정 로직 검증

### 통합 테스트

- 차트에 일목균형표가 올바르게 표시되는지 확인
- 호버 시 일목균형표 값이 올바르게 표시되는지 확인
- 데이터 부족 시 일목균형표가 표시되지 않는지 확인

---

## 관련 문서

- [프론트엔드 품질 원칙](../../docs/FRONTEND_PRACTICES.md)
- [코드 리뷰 체크리스트](../../docs/CODE_REVIEW_CHECKLIST.md)
- [피쳐 개발 워크플로우](../../docs/FEATURE_DEVELOPMENT_WORKFLOW.md)


