# Implementation Plan: 테이블에 PEG 및 PER 컬럼 추가

**Branch**: `feature/table-peg-per-columns` | **Date**: 2025-11-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/table-peg-per-columns/spec.md`

## Summary

스크리너 테이블에 PER(Price-to-Earnings Ratio)과 PEG(Price/Earnings to Growth Ratio) 컬럼을 추가하여 사용자가 종목의 밸류에이션을 더 쉽게 평가할 수 있도록 합니다. quarterly_ratios 테이블에 이미 존재하는 데이터를 활용합니다.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 15, React 19  
**Primary Dependencies**: Next.js, React, Drizzle ORM, PostgreSQL  
**Storage**: PostgreSQL (quarterly_ratios 테이블 활용)  
**Testing**: Vitest (기존 테스트 프레임워크 유지)  
**Target Platform**: Web (Next.js App Router)  
**Project Type**: Web application (Next.js App Router 기반)  
**Performance Goals**: 테이블 렌더링 성능 저하 없음, API 응답 시간 증가 < 100ms  
**Constraints**: 기존 테이블 구조 유지, 기존 기능 모두 정상 작동  
**Scale/Scope**: 테이블 컬럼 2개 추가

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- ✅ 기존 프로젝트 구조 활용 (새 프로젝트 생성 불필요)
- ✅ 기존 기술 스택 유지 (Next.js, React, TypeScript)
- ✅ 기존 데이터베이스 스키마 활용 (quarterly_ratios 테이블에 이미 데이터 존재)
- ✅ 기존 UI 컴포넌트 활용 (Table 컴포넌트 확장)

## Project Structure

### Documentation (this feature)

```text
specs/table-peg-per-columns/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task list (to be generated)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       └── screener/
│           └── golden-cross/
│               └── route.ts              # quarterly_ratios JOIN 추가
├── app/
│   └── screener/
│       └── golden-cross/
│           └── GoldenCrossClient.tsx     # 테이블에 PER/PEG 컬럼 추가
└── types/
    └── golden-cross.ts                   # 타입 정의에 pe_ratio, peg_ratio 추가
```

## Key Technical Decisions

### 1. 데이터 소스

- **Decision**: quarterly_ratios 테이블에서 최신 분기의 pe_ratio와 peg_ratio를 가져옴
- **Rationale**: 
  - 이미 데이터가 존재하므로 추가 ETL 작업 불필요
  - 최신 분기 데이터만 필요하므로 단순한 JOIN으로 처리 가능
- **Alternatives Considered**: 
  - 실시간 계산: 성능 오버헤드가 크고, 이미 계산된 데이터가 있음
  - 모든 분기 데이터: 현재는 최신 분기만 필요

### 2. 데이터 포맷팅

- **Decision**: 소수점 2자리까지 표시, 데이터 없으면 "-" 표시
- **Rationale**: 
  - PER과 PEG는 일반적으로 소수점 2자리로 표시
  - 데이터 없음을 명확히 표시하기 위해 "-" 사용
- **Alternatives Considered**: 
  - 소수점 1자리: 2자리가 더 정확
  - "N/A" 표시: "-"가 더 간결

### 3. 테이블 레이아웃

- **Decision**: PER과 PEG 컬럼을 EPS 컬럼 다음에 추가
- **Rationale**: 
  - EPS와 관련된 지표이므로 논리적으로 가까운 위치에 배치
  - 기존 레이아웃의 자연스러운 확장
- **Alternatives Considered**: 
  - 맨 끝에 배치: 관련 지표와 분리되어 직관적이지 않음
  - Market Cap 다음: 밸류에이션 지표이지만 EPS와의 연관성이 더 강함

### 4. API 응답 구조

- **Decision**: GoldenCrossCompany 타입에 pe_ratio와 peg_ratio 필드 추가
- **Rationale**: 
  - 기존 타입 구조를 유지하면서 확장
  - null 허용하여 데이터가 없는 경우 처리
- **Alternatives Considered**: 
  - 별도 타입 생성: 불필요한 복잡도 증가
  - 옵셔널 체이닝: 타입 안정성을 위해 명시적 null 처리

## Data Models

### API Response Type

```typescript
export interface GoldenCrossCompany {
  symbol: string;
  market_cap: string | null;
  last_close: string;
  quarterly_financials: QuarterlyFinancial[];
  profitability_status: "profitable" | "unprofitable" | "unknown";
  revenue_growth_status: "growing" | "not_growing" | "unknown";
  income_growth_status: "growing" | "not_growing" | "unknown";
  revenue_growth_quarters: number;
  income_growth_quarters: number;
  revenue_avg_growth_rate: number | null;
  income_avg_growth_rate: number | null;
  ordered: boolean;
  just_turned: boolean;
  pe_ratio: number | null;        // 추가
  peg_ratio: number | null;       // 추가
}
```

### Database Query

```sql
-- quarterly_ratios 테이블에서 최신 분기의 PER과 PEG 가져오기
LEFT JOIN LATERAL (
  SELECT 
    pe_ratio::numeric as pe_ratio,
    peg_ratio::numeric as peg_ratio
  FROM quarterly_ratios
  WHERE symbol = cand.symbol
    AND (pe_ratio IS NOT NULL OR peg_ratio IS NOT NULL)
  ORDER BY period_end_date DESC
  LIMIT 1
) qr ON true
```

## Implementation Strategy

### Phase 1: Backend (API)

1. API 라우트에서 quarterly_ratios 테이블 JOIN 추가
2. 최신 분기의 pe_ratio와 peg_ratio를 SELECT
3. 응답에 pe_ratio와 peg_ratio 포함

### Phase 2: Type Definitions

1. GoldenCrossCompany 타입에 pe_ratio와 peg_ratio 필드 추가
2. null 허용 타입으로 정의

### Phase 3: Frontend (UI)

1. 테이블 헤더에 PER과 PEG 컬럼 추가
2. 테이블 바디에 PER과 PEG 값 표시
3. 데이터 포맷팅 함수 구현 (소수점 2자리, "-" 처리)
4. 반응형 레이아웃 고려 (모바일에서도 적절히 표시)

### Phase 4: Testing & Polish

1. 빌드 테스트
2. 데이터가 없는 경우 테스트
3. 음수 값 처리 테스트
4. 기존 기능 회귀 테스트

## Risk Assessment

### Low Risk

- 기존 데이터 활용: quarterly_ratios 테이블에 이미 데이터가 존재
- 단순한 확장: 기존 테이블 구조에 컬럼만 추가
- 타입 안정성: TypeScript로 타입 체크 가능

### Medium Risk

- 성능 영향: JOIN 추가로 인한 쿼리 성능 저하 가능성 (하지만 최신 분기만 가져오므로 영향 미미)
- 데이터 품질: 일부 종목에 PER/PEG 데이터가 없을 수 있음 (이미 "-" 처리로 해결)

### Mitigation

- 인덱스 확인: quarterly_ratios 테이블의 인덱스가 적절한지 확인
- 쿼리 최적화: LATERAL JOIN을 사용하여 필요한 데이터만 가져오기
- 포맷팅 함수: 데이터가 없는 경우를 명확히 처리

## Dependencies

- **Database**: quarterly_ratios 테이블에 pe_ratio와 peg_ratio 데이터 존재 (이미 확인됨)
- **API**: 기존 golden-cross API 엔드포인트 확장
- **Frontend**: 기존 Table 컴포넌트 확장

## Testing Strategy

### Unit Tests

- 포맷팅 함수 테스트 (소수점 2자리, null 처리)
- 타입 정의 테스트

### Integration Tests

- API 응답에 PER/PEG 데이터 포함 확인
- 테이블에 PER/PEG 컬럼 표시 확인
- 데이터가 없는 경우 "-" 표시 확인

### Manual Testing

- 다양한 종목으로 테이블 확인
- 데이터가 있는/없는 종목 혼합 확인
- 반응형 레이아웃 확인

