# AI 에이전트 가이드: 프로젝트 분석 & 비즈니스 이해

## 🎯 목적

이 문서는 AI 에이전트가 이 프로젝트의 **코드베이스와 비즈니스 로직**을 깊이 있게 이해하고 분석하기 위한 종합 가이드입니다.

---

## 📊 프로젝트 개요

### 비즈니스 도메인

**Stock Screener**: 개인 투자자를 위한 주식 스크리닝 도구

- **기술적 분석**: 이동평균선(MA), RS Score, RSI, MACD
- **펀더멘털 분석**: 분기별 재무, 성장률, 밸류에이션 지표(PER, PEG)
- **매매일지**: 포지션 관리, 손익 추적, R-Multiple 계산

### 핵심 가치 제안

1. **통합 필터링**: 기술적/펀더멘털 조건을 한 번에 적용
2. **실시간 데이터**: 일일 주가, 분기별 재무 자동 업데이트
3. **투자 의사결정 지원**: 필터링 → 상세 분석 → 매매일지 기록 플로우

---

## 🏗️ 아키텍처 패턴 분석

### 1. 데이터 레이어 (Data Layer)

#### 스키마 설계 원칙

```typescript
// apps/web/src/db/schema.ts
```

**패턴**:

- **시계열 데이터**: `daily_prices`, `daily_ma`, `daily_ratios` (date + symbol 복합 키)
- **분기 데이터**: `quarterly_financials`, `quarterly_ratios` (period_end_date)
- **인덱스 전략**: `(symbol, date)` 복합 인덱스로 조회 최적화
- **Cascade 삭제**: `symbols` 삭제 시 관련 데이터 자동 정리

**분석**:

- ✅ **멱등성 보장**: ETL은 `ON CONFLICT DO UPDATE`로 중복 실행 안전
- ✅ **타입 일원화**: Drizzle 스키마가 프론트엔드 타입의 Source of Truth
- ⚠️ **성능 고려**: `daily_ma` 조인 시 인덱스 활용 확인 필요

#### 쿼리 빌더 패턴

```typescript
// apps/web/src/lib/screener/query-builder.ts
```

**패턴**:

- **CTE 분리**: `last_d`, `cur`, `candidates`, `prev_ma` 등 단계별 CTE
- **조건부 쿼리**: `requireMA` 플래그로 MA 데이터 필요 여부 분기
- **동적 SQL**: 필터 조건에 따라 SQL 조각 조합

**분석**:

- ✅ **모듈화**: 500줄 쿼리를 함수 단위로 분리 (유지보수성 ↑)
- ⚠️ **쿼리 최적화 기회**:
  - `LEFT JOIN` vs `INNER JOIN` 선택 (필터 조건에 따라)
  - 서브쿼리 최적화: `(symbol, date) IN (SELECT ...)` → `EXISTS` 고려
  - 인덱스 힌트: 복잡한 필터 조합 시 쿼리 플랜 분석 필요

### 2. 상태 관리 레이어 (State Management)

#### URL 기반 상태 관리

```typescript
// apps/web/src/hooks/useFilterState.ts
```

**패턴**:

- **nuqs**: URL 쿼리 파라미터 ↔ React 상태 동기화
- **localStorage**: 기본 필터 자동 저장/복원
- **우선순위**: URL > localStorage > 기본값

**분석**:

- ✅ **공유 가능**: URL로 필터 상태 공유 가능 (UX ↑)
- ✅ **브라우저 히스토리**: 뒤로가기/앞으로가기 지원
- ⚠️ **성능 고려**:
  - URL 변경 시마다 API 재호출 → **캐싱 전략 필요**
  - localStorage 읽기/쓰기 비용 → debounce 적용 (현재 구현됨)

#### 필터 상태 정규화

```typescript
// apps/web/src/app/(screener)/ScreenerClient.tsx
```

**패턴**:

- **정규화**: `null`/`undefined` → `undefined` 통일
- **타입 안전성**: `FilterState` 타입으로 모든 필터 상태 관리

**분석**:

- ✅ **단일 소스**: `FilterState`가 필터 상태의 Source of Truth
- ⚠️ **개선 기회**:
  - 필터 상태 변경 시 **낙관적 업데이트** 고려
  - 필터 조합 유효성 검사 (예: `justTurned`는 `ordered=true`일 때만 의미 있음)

### 3. 프레젠테이션 레이어 (Presentation Layer)

#### 컴포넌트 계층 구조

```
ScreenerClient (상태 관리)
  ├── FilterView (필터 UI)
  ├── ScreenerDataWrapper (데이터 페칭)
  └── StockTable (테이블 렌더링)
```

**패턴**:

- **서버/클라이언트 분리**: `page.tsx` (서버) → `*Client.tsx` (클라이언트)
- **Suspense 경계**: 로딩 상태를 Suspense로 처리
- **메모이제이션**: `React.memo`, `useMemo`, `useCallback` 적극 활용

**분석**:

- ✅ **성능 최적화**: 무한 스크롤, 메모이제이션으로 5000개 데이터 처리
- ⚠️ **개선 기회**:
  - **가상화**: `@tanstack/react-virtual` 도입 검토 (현재 무한 스크롤)
  - **코드 스플리팅**: 필터 다이얼로그 lazy load

---

## 💡 비즈니스 로직 이해

### 1. 필터링 로직

#### 이평선 필터 (MA Filter)

**비즈니스 의미**:

- **정배열 (ordered)**: MA20 > MA50 > MA100 > MA200 → 상승 추세
- **Golden Cross**: MA50 > MA200 → 중장기 상승 전환 신호
- **이평선 위 필터**: 종가 > MA20/50/100/200 → 단기/중기/장기 상승 모멘텀

**분석**:

- ✅ **조건부 쿼리**: `requireMA` 플래그로 MA 데이터 필요 여부 분기
- ⚠️ **비즈니스 규칙**:
  - `justTurned`는 `ordered=true`일 때만 의미 있음 → **유효성 검사 추가 권장**
  - MA 데이터가 없는 종목 처리: `LEFT JOIN`으로 포함 (현재 구현됨)

#### 성장성 필터 (Growth Filter)

**비즈니스 의미**:

- **연속 성장 분기**: 최근 N분기 동안 매출/수익이 계속 증가
- **평균 성장률**: 최근 N분기 동안 평균 성장률이 X% 이상
- **PEG < 1**: 성장 대비 저평가 (성장률 대비 PER이 낮음)

**분석**:

- ✅ **AND 조건**: 여러 필터를 조합하여 정밀한 선별 가능
- ⚠️ **데이터 품질**:
  - 분기 데이터 부족 시 처리: 최소 2분기 데이터 필요 (현재 검증됨)
  - 음수 성장률 처리: `PEG < 1` 필터는 0 이상만 포함 (현재 구현됨)

#### 수익성 필터 (Profitability Filter)

**비즈니스 의미**:

- **흑자/적자**: EPS > 0 / EPS ≤ 0
- **최근 흑자 전환**: 직전 분기 적자 → 최근 분기 흑자 (반등 신호)

**분석**:

- ✅ **엣지 케이스**: EPS 데이터 2분기 미만 시 제외 (현재 구현됨)
- ⚠️ **비즈니스 규칙**:
  - `turnAround`는 `profitability !== 'all'`일 때만 의미 있음 → **유효성 검사 추가 권장**

### 2. 계산 로직

#### RS Score (Relative Strength)

**비즈니스 의미**:

- **12M/6M/3M 가중합**: 최근 성과에 더 높은 가중치 (0.2/0.3/0.5)
- **상대 강도**: 시장 대비 종목의 상대적 성과

**분석**:

- ✅ **ETL 최적화**: 일일 계산 후 DB 저장 (클라이언트 계산 비용 절감)
- ⚠️ **성능 고려**: RS Score 계산은 ETL에서 처리 (현재 구현됨)

#### R-Multiple (Trading Journal)

**비즈니스 의미**:

- **R = Risk**: 진입가와 손절가 차이 (1R = 손절 시 손실)
- **R-Multiple**: 실제 수익 / R (2R = 목표가 달성 시 2배 수익)

**계산 로직** (`apps/web/src/lib/trades/calculations.ts`):

```typescript
// 평균 진입가 (가중평균)
avgEntryPrice = totalBuyAmount / totalBuyQuantity;

// R-Multiple 계산
riskPerShare = avgEntryPrice - stopLossPrice;
profitPerShare = realizedPnl / totalSellQuantity;
rMultiple = profitPerShare / riskPerShare;
```

**분석**:

- ✅ **자동 계산**: 평단가, 손익금, 수익률, R-Multiple 자동 계산
- ✅ **분할 매수/매도 지원**: 가중평균으로 평단가 자동 재계산
- ✅ **수수료 고려**: 매수/매도 모두에 수수료율 적용 (기본 0.07%)
- ⚠️ **비즈니스 규칙**:
  - 손절가가 없으면 R-Multiple 계산 불가 (`null` 반환)
  - `riskPerShare <= 0`이면 R-Multiple 계산 불가 (손절가가 진입가보다 높거나 같음)

#### 매매 통계 계산

**비즈니스 의미**:

- **승률**: 이익 거래 / 전체 거래
- **Profit Factor**: 총 이익 / 총 손실 (1 이상이면 수익)
- **평균 R-Multiple**: 모든 거래의 R-Multiple 평균
- **연속 승/패**: 최대 연속 승리/패배 횟수

**계산 로직**:

```typescript
// 전략별 통계
strategyMap: Map<strategy, { trades; wins; losses; totalPnl; rValues }>;

// 연속 승/패 계산
if (lastResult === "win") currentStreak++;
else currentStreak = 1;
maxWinStreak = Math.max(maxWinStreak, currentStreak);
```

**분석**:

- ✅ **전략별 분석**: 전략 태그별 승률, 평균 R-Multiple 제공
- ✅ **엣지 케이스**: 빈 배열, 단일 거래 처리
- ⚠️ **개선 기회**:
  - **보유 기간 분석**: 평균 보유 기간 계산 (현재 구현됨)
  - **월별/연도별 통계**: 시간대별 성과 분석 추가 가능

---

## 🔍 코드 리뷰 시 고려사항

### 1. 아키텍처 관점

#### 레이어 분리

**체크리스트**:

- [ ] **표현 ↔ 상태 ↔ 서비스 분리**: UI 컴포넌트는 상태/서비스 레이어에 의존
- [ ] **사이드 이펙트 격리**: API 호출, localStorage 접근은 훅/서비스 레이어에만
- [ ] **도메인 메타 정의**: 테이블/필터/정렬은 메타 객체로 정의

**예시**:

```typescript
// ❌ 나쁜 예: UI에서 직접 API 호출
function StockTable() {
  const [data, setData] = useState([]);
  useEffect(() => {
    fetch('/api/screener/stocks').then(...); // 사이드 이펙트가 UI에
  }, []);
}

// ✅ 좋은 예: 훅으로 분리
function StockTable() {
  const { data } = useScreenerData(); // 상태 관리 훅 사용
}
```

#### 단일 책임 원칙 (SRP)

**체크리스트**:

- [ ] **함수 길이**: 200줄 이상이면 분리 검토
- [ ] **컴포넌트 복잡도**: 하나의 컴포넌트가 너무 많은 역할을 하지 않는가?

**예시**:

```typescript
// ❌ 나쁜 예: 하나의 함수가 너무 많은 일
function buildScreenerQuery(params) {
  // 500줄 쿼리...
}

// ✅ 좋은 예: 함수 분리
function buildScreenerQuery(params) {
  const lastDateCTE = buildLastDateCTE(params);
  const currentDataCTE = buildCurrentDataCTE(params);
  // ...
}
```

### 2. 타입 안전성

#### 타입 정의 일원화

**체크리스트**:

- [ ] **Source of Truth**: DB 스키마(Drizzle) → 프론트엔드 타입 파생
- [ ] **타입 중복**: 동일한 인터페이스가 여러 파일에 정의되지 않았는가?

**예시**:

```typescript
// ✅ 좋은 예: 단일 소스
// db/schema.ts
export const symbols = pgTable("symbols", { ... });

// types/screener.ts
export type Symbol = typeof symbols.$inferSelect;
```

#### Null/Undefined 처리

**체크리스트**:

- [ ] **명시적 가드**: `obj?.prop` 또는 `if (!obj) return` 사용
- [ ] **Non-null assertion 금지**: `value!` 사용 지양

**예시**:

```typescript
// ❌ 나쁜 예
const percent = formatPercent(getPercent(value)!, 1);

// ✅ 좋은 예
const percent = getPercent(value);
if (percent !== null) {
  formatPercent(percent, 1);
}
```

### 3. 성능 최적화

#### 렌더링 최적화

**체크리스트**:

- [ ] **메모이제이션**: 무거운 연산은 `useMemo`, 함수는 `useCallback`
- [ ] **가상화**: 1000개 이상 리스트는 가상화 고려
- [ ] **코드 스플리팅**: 큰 컴포넌트는 lazy load

**예시**:

```typescript
// ✅ 좋은 예: 메모이제이션
const chartData = useMemo(() => {
  return calculateChartData(rawData);
}, [rawData]);

const handleSort = useCallback((field: string) => {
  setSortField(field);
}, []);
```

#### 쿼리 최적화

**체크리스트**:

- [ ] **인덱스 활용**: `(symbol, date)` 복합 인덱스 확인
- [ ] **조인 최적화**: `LEFT JOIN` vs `INNER JOIN` 선택
- [ ] **서브쿼리 최적화**: `IN` → `EXISTS` 고려

**예시**:

```sql
-- ⚠️ 개선 기회: IN 서브쿼리
WHERE (symbol, date) IN (SELECT symbol, MAX(date) FROM ...)

-- ✅ 개선: EXISTS 또는 윈도우 함수
WHERE EXISTS (SELECT 1 FROM ... WHERE ...)
```

### 4. 에러 핸들링

#### 에러 처리 전략

**체크리스트**:

- [ ] **에러 전파**: catch 블록에서 에러를 삼키지 말 것
- [ ] **사용자 피드백**: 에러 발생 시 UI 피드백 제공
- [ ] **로깅**: 중요 오류는 Sentry 등으로 수집

**예시**:

```typescript
// ❌ 나쁜 예: 에러를 삼킴
try {
  await api.save();
} catch (error) {
  console.error(error); // 로그만 찍고 끝
}

// ✅ 좋은 예: 에러 전파 및 UI 피드백
try {
  await api.save();
} catch (error) {
  logError(error, "Save failed");
  setError("저장에 실패했습니다. 다시 시도해주세요.");
  throw error; // 상위로 전파
}
```

#### 낙관적 업데이트

**체크리스트**:

- [ ] **롤백 로직**: 실패 시 이전 상태로 복구

**예시**:

```typescript
// ✅ 좋은 예: 롤백 로직
const handleSave = async () => {
  const previous = value;
  setValue(newValue);
  try {
    await api.save();
  } catch {
    setValue(previous); // 롤백
  }
};
```

---

## 🚀 개선 기회 식별 방법

### 1. 코드 스멜 탐지

#### 중복 코드 (DRY 위반)

**탐지 방법**:

- 동일한 로직이 3곳 이상 반복
- 유사한 함수명 패턴 (`handleX`, `formatX` 등)

**개선 전략**:

- 공통 함수/컴포넌트로 추출
- 유틸리티 함수로 승격

#### 매직 넘버/스트링

**탐지 방법**:

- 하드코딩된 숫자/색상 코드
- 의미 불명확한 상수

**개선 전략**:

- 상수 파일로 추출 (`lib/config/constants.ts`)
- Tailwind 토큰으로 승격

### 2. 성능 병목 탐지

#### 렌더링 성능

**탐지 방법**:

- React DevTools Profiler로 렌더링 시간 측정
- 불필요한 리렌더링 확인

**개선 전략**:

- `React.memo`로 컴포넌트 메모이제이션
- `useMemo`/`useCallback`으로 연산/함수 메모이제이션

#### 쿼리 성능

**탐지 방법**:

- PostgreSQL `EXPLAIN ANALYZE`로 쿼리 플랜 분석
- 느린 쿼리 로그 확인

**개선 전략**:

- 인덱스 추가/최적화
- 쿼리 구조 개선 (서브쿼리 → JOIN 등)

### 3. 비즈니스 로직 검증

#### 필터 조합 유효성

**탐지 방법**:

- 필터 상태 조합이 비즈니스 규칙을 위반하는지 확인

**예시**:

```typescript
// ⚠️ 개선 필요: 유효성 검사 추가
if (params.justTurned && !params.ordered) {
  return { valid: false, error: "justTurned requires ordered=true" };
}
```

#### 데이터 품질

**탐지 방법**:

- 엣지 케이스 처리 확인 (null, 빈 배열, 경계값)

**예시**:

```typescript
// ✅ 좋은 예: 엣지 케이스 처리
if (quarters.length < 2) {
  return null; // 최소 2분기 데이터 필요
}
```

---

## 📈 코드 분석 및 개선 제안 방법

### 1. 아키텍처 관점

**분석 관점**:

- 현재 구현의 **장단점** 분석
- **대안 제시**: 다른 아키텍처 패턴과 비교
- **트레이드오프**: 성능 vs 유지보수성, 복잡도 vs 확장성

**예시**:

```
현재: URL 기반 상태 관리 (nuqs)
장점: 공유 가능, 브라우저 히스토리 지원
단점: URL 변경 시마다 API 재호출
대안: React Query 캐싱 + URL 동기화
트레이드오프: 캐시 복잡도 증가 vs 성능 향상
```

### 2. 비즈니스 로직 관점

**분석 관점**:

- 필터링 로직의 **비즈니스 의미** 설명
- **데이터 품질** 이슈 식별
- **엣지 케이스** 처리 검증

**예시**:

```
필터: justTurned (최근 정배열 전환)
비즈니스 의미: 상승 추세 전환 신호 포착
데이터 요구사항: ordered=true 필수, MA 데이터 필요
엣지 케이스: MA 데이터 부족 시 처리 필요
```

### 3. 성능 최적화 관점

**분석 관점**:

- **병목 구간** 식별
- **최적화 기회** 제시
- **측정 방법** 안내

**예시**:

```
병목: 5000개 데이터 렌더링
현재 해결: 무한 스크롤 (100개 초기, 50개씩 추가)
개선 기회: 가상화(@tanstack/react-virtual) 도입
측정: React DevTools Profiler로 렌더링 시간 확인
```

### 4. 코드 품질 관점

**분석 관점**:

- **코드 스멜** 탐지
- **리팩토링 제안**
- **테스트 전략** 제안

**예시**:

```
스멜: 500줄 쿼리 함수
리팩토링: CTE별 함수 분리 (완료)
테스트: 각 CTE 함수 단위 테스트 (권장)
```

---

## 🎓 학습 리소스

### 프로젝트 문서

- [`CODE_REVIEW_CHECKLIST.md`](./CODE_REVIEW_CHECKLIST.md): 코드 리뷰 체크리스트
- [`FRONTEND_PRACTICES.md`](./FRONTEND_PRACTICES.md): 프론트엔드 품질 원칙
- [`FEATURE_DEVELOPMENT_WORKFLOW.md`](./FEATURE_DEVELOPMENT_WORKFLOW.md): 피쳐 개발 워크플로우
- [`TESTING.md`](./TESTING.md): 테스트 가이드

### 코드베이스 탐색

**핵심 파일**:

- `apps/web/src/db/schema.ts`: 데이터베이스 스키마
- `apps/web/src/lib/screener/query-builder.ts`: 쿼리 빌더
- `apps/web/src/hooks/useFilterState.ts`: 필터 상태 관리
- `apps/web/src/app/(screener)/ScreenerClient.tsx`: 메인 컴포넌트

**스펙 문서**:

- `.specify/specs/`: 피쳐별 스펙/플랜/태스크

---

## ✅ 체크리스트: 코드 리뷰 관점

코드 리뷰 시 다음 항목을 확인하세요:

### 아키텍처

- [ ] 레이어 분리가 명확한가? (표현 ↔ 상태 ↔ 서비스)
- [ ] 단일 책임 원칙을 준수하는가? (함수/컴포넌트가 하나의 역할만)
- [ ] 도메인 메타 정의를 사용하는가? (테이블/필터/정렬)

### 타입 안전성

- [ ] Source of Truth가 명확한가? (DB 스키마 → 타입 파생)
- [ ] Null/Undefined 처리가 명시적인가?
- [ ] 타입 중복이 없는가?

### 성능

- [ ] 불필요한 렌더링이 없는가? (메모이제이션)
- [ ] 쿼리가 최적화되었는가? (인덱스, 조인)
- [ ] 캐싱 전략이 적절한가?

### 에러 핸들링

- [ ] 에러가 적절히 전파되는가?
- [ ] 사용자 피드백이 제공되는가?
- [ ] 롤백 로직이 있는가? (낙관적 업데이트)

### 비즈니스 로직

- [ ] 필터 조합 유효성이 검증되는가?
- [ ] 엣지 케이스가 처리되는가?
- [ ] 데이터 품질이 보장되는가?

---

## 🔄 지속적 개선

이 가이드는 프로젝트와 함께 진화합니다. 새로운 패턴이나 인사이트를 발견하면 이 문서를 업데이트하세요.

**업데이트 시점**:

- 새로운 아키텍처 패턴 도입 시
- 성능 최적화 성과 측정 시
- 비즈니스 로직 변경 시
- 코드 리뷰에서 반복되는 이슈 발견 시
