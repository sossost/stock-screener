# 일목균형표 구현 계획

**Feature Branch**: `feature/ichimoku-cloud`  
**Created**: 2025-12-08  
**Status**: 🚧 In Progress

## 기술적 컨텍스트

### 현재 구조

- **차트 라이브러리**: Lightweight Charts
- **기술적 지표 계산**: 프론트엔드에서 실시간 계산 (`apps/web/src/lib/technical-indicators.ts`)
- **차트 컴포넌트**: `apps/web/src/components/stock-detail/TechnicalChart.tsx`
- **데이터 소스**: `/api/stock/[symbol]/prices` (dailyPrices만 사용)
- **기존 지표**: SMA(20/50/100/200), RSI(14), MACD(12/26/9)

### 기존 패턴

- 기술적 지표는 `technical-indicators.ts`에서 계산
- `TechnicalChart.tsx`에서 `useMemo`로 최적화
- Lightweight Charts의 `LineSeries`, `HistogramSeries` 사용 중
- 호버 데이터는 `HoverData` 인터페이스로 관리

### 핵심 제약사항

- **최소 데이터 요구사항**: 52일 이상의 가격 데이터 필요
- **프론트엔드 계산**: ETL 없이 클라이언트에서 계산 (기존 패턴 유지)
- **성능**: `useMemo`로 최적화, 초기 로드 시 +15-25ms 추가 예상

---

## 구현 단계

### Phase 1: 계산 로직 구현

**목표**: 일목균형표 계산 함수 구현

#### 1.1 타입 정의

**파일**: `apps/web/src/lib/technical-indicators.ts`

```typescript
export interface IchimokuData {
  time: string; // 'YYYY-MM-DD'
  tenkanSen: number | null; // 전환선
  kijunSen: number | null; // 기준선
  senkouSpanA: number | null; // 선행스팬 A (26일 앞으로 이동)
  senkouSpanB: number | null; // 선행스팬 B (26일 앞으로 이동)
}
```

#### 1.2 계산 함수 구현

**파일**: `apps/web/src/lib/technical-indicators.ts`

```typescript
/**
 * 일목균형표 계산
 * @param data OHLC 데이터 (최소 52일 이상 필요)
 * @returns IchimokuData 배열
 */
export function calculateIchimokuWithTime(
  data: OHLCData[]
): IchimokuData[] {
  if (data.length < 52) {
    return data.map((d) => ({
      time: d.time,
      tenkanSen: null,
      kijunSen: null,
      senkouSpanA: null,
      senkouSpanB: null,
    }));
  }

  // 1. 전환선 계산 (9일 고저 평균)
  const tenkanSen: number[] = [];
  for (let i = 8; i < data.length; i++) {
    const highs = data.slice(i - 8, i + 1).map((d) => d.high);
    const lows = data.slice(i - 8, i + 1).map((d) => d.low);
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    tenkanSen.push((maxHigh + minLow) / 2);
  }

  // 2. 기준선 계산 (26일 고저 평균)
  const kijunSen: number[] = [];
  for (let i = 25; i < data.length; i++) {
    const highs = data.slice(i - 25, i + 1).map((d) => d.high);
    const lows = data.slice(i - 25, i + 1).map((d) => d.low);
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    kijunSen.push((maxHigh + minLow) / 2);
  }

  // 3. 선행스팬 A 계산: (전환선 + 기준선) / 2
  const senkouSpanA: number[] = [];
  for (let i = 0; i < Math.min(tenkanSen.length, kijunSen.length); i++) {
    senkouSpanA.push((tenkanSen[i] + kijunSen[i]) / 2);
  }

  // 4. 선행스팬 B 계산 (52일 고저 평균)
  const senkouSpanB: number[] = [];
  for (let i = 51; i < data.length; i++) {
    const highs = data.slice(i - 51, i + 1).map((d) => d.high);
    const lows = data.slice(i - 51, i + 1).map((d) => d.low);
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    senkouSpanB.push((maxHigh + minLow) / 2);
  }

  // 5. 결과 조합 (26일 앞으로 시간 이동)
  const result: IchimokuData[] = [];
  
  // 초기 52일은 null로 채움
  for (let i = 0; i < 52; i++) {
    result.push({
      time: data[i].time,
      tenkanSen: i >= 8 ? tenkanSen[i - 8] : null,
      kijunSen: i >= 25 ? kijunSen[i - 25] : null,
      senkouSpanA: null, // 26일 앞으로 이동하므로 초기에는 null
      senkouSpanB: null, // 26일 앞으로 이동하므로 초기에는 null
    });
  }

  // 선행스팬 A/B를 26일 앞으로 이동하여 배치
  for (let i = 26; i < data.length; i++) {
    const tenkanIdx = i - 8;
    const kijunIdx = i - 25;
    const senkouAIdx = i - 26;
    const senkouBIdx = i - 26;

    if (tenkanIdx >= 0 && tenkanIdx < tenkanSen.length) {
      result[i].tenkanSen = tenkanSen[tenkanIdx];
    }
    if (kijunIdx >= 0 && kijunIdx < kijunSen.length) {
      result[i].kijunSen = kijunSen[kijunIdx];
    }
    if (senkouAIdx >= 0 && senkouAIdx < senkouSpanA.length) {
      // 26일 앞으로 이동: 현재 인덱스에 senkouAIdx의 값을 배치
      if (i + 26 < result.length) {
        result[i + 26].senkouSpanA = senkouSpanA[senkouAIdx];
      }
    }
    if (senkouBIdx >= 0 && senkouBIdx < senkouSpanB.length) {
      // 26일 앞으로 이동: 현재 인덱스에 senkouBIdx의 값을 배치
      if (i + 26 < result.length) {
        result[i + 26].senkouSpanB = senkouSpanB[senkouBIdx];
      }
    }
  }

  return result;
}
```

### Phase 2: 차트 표시 구현

**목표**: Lightweight Charts에 일목균형표 시리즈 추가

#### 2.1 TechnicalChart 컴포넌트 수정

**파일**: `apps/web/src/components/stock-detail/TechnicalChart.tsx`

**추가 작업**:
1. `calculateIchimokuWithTime` import
2. `allIndicatorData`에 일목균형표 계산 추가
3. `HoverData` 인터페이스에 일목균형표 필드 추가
4. 차트에 전환선/기준선/구름대 시리즈 추가

**구현 예시**:
```typescript
// allIndicatorData에 일목균형표 추가
const ichimokuData = calculateIchimokuWithTime(ohlcData);

// 차트에 시리즈 추가
// 1. 구름대 (Area Series) - 먼저 추가 (하위 레이어)
const cloudSeries = mainChart.addSeries(AreaSeries, {
  lineColor: "transparent",
  topColor: "#22c55e80", // 초록 (A > B)
  bottomColor: "#ef444480", // 빨강 (A < B)
  priceLineVisible: false,
  lastValueVisible: false,
});

// 구름대 데이터 (선행스팬 A/B)
const cloudData: AreaData<Time>[] = priceData
  .map((d, i) => {
    const ichimoku = ichimokuData[i];
    if (!ichimoku || ichimoku.senkouSpanA === null || ichimoku.senkouSpanB === null) {
      return null;
    }
    return {
      time: d.date as Time,
      value: Math.max(ichimoku.senkouSpanA, ichimoku.senkouSpanB),
      value2: Math.min(ichimoku.senkouSpanA, ichimoku.senkouSpanB),
    };
  })
  .filter((d): d is AreaData<Time> => d !== null);

cloudSeries.setData(cloudData);

// 2. 전환선 (Line Series)
const tenkanSeries = mainChart.addSeries(LineSeries, {
  color: "#f97316", // 주황
  lineWidth: 1,
  priceLineVisible: false,
  lastValueVisible: false,
});

// 3. 기준선 (Line Series)
const kijunSeries = mainChart.addSeries(LineSeries, {
  color: "#3b82f6", // 파랑
  lineWidth: 1,
  priceLineVisible: false,
  lastValueVisible: false,
});
```

#### 2.2 호버 데이터 표시

**파일**: `apps/web/src/components/stock-detail/TechnicalChart.tsx`

호버 시 일목균형표 값 표시:
- 전환선: `hoverData.tenkanSen`
- 기준선: `hoverData.kijunSen`
- 선행스팬 A: `hoverData.senkouSpanA`
- 선행스팬 B: `hoverData.senkouSpanB`

---

## 성능 기대 효과

### 계산 성능

- **데이터량**: 250-260일 (1Y 기간)
- **계산 시간**: 1-3ms (JavaScript)
- **렌더링 시간**: 10-20ms (Lightweight Charts)
- **전체 영향**: 초기 로드 시 +15-25ms (체감 어려움)

### 최적화

- `useMemo`로 계산 결과 메모이제이션
- `priceData` 변경 시에만 재계산
- 60fps 기준 프레임 시간(16.67ms) 내 처리 가능

---

## 리스크 및 대응

### 리스크 1: 데이터 부족

**가능성**: 낮음  
**영향**: 중간  
**대응**: 최소 52일 데이터 요구사항 체크, 부족 시 일목균형표 표시 안 함

### 리스크 2: 시간 이동 로직 복잡도

**가능성**: 중간  
**영향**: 중간  
**대응**: 단위 테스트로 시간 이동 로직 검증

### 리스크 3: 차트 복잡도 증가

**가능성**: 낮음  
**영향**: 낮음  
**대응**: 구름대를 반투명으로 표시하여 기존 차트와 구분

---

## 검증 방법

### 성능 측정

1. 계산 시간 측정 (Before/After)
2. 렌더링 시간 측정
3. 사용자 체감 지연 확인

### 기능 검증

1. 일목균형표가 올바르게 계산되는지 확인
2. 차트에 올바르게 표시되는지 확인
3. 호버 시 값이 올바르게 표시되는지 확인
4. 데이터 부족 시 표시되지 않는지 확인


