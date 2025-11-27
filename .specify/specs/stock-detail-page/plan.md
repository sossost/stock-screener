# Implementation Plan: 종목 상세 페이지

**Branch**: `feature/stock-detail-page` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/stock-detail-page/spec.md`

## Summary

스크리너 테이블에서 종목 클릭 시 해당 종목의 상세 정보를 확인할 수 있는 페이지(`/stock/[symbol]`)를 구현한다. 기존 DB에 저장된 데이터(symbols, quarterlyFinancials, quarterlyRatios, dailyPrices, dailyMa)를 활용하여 외부 API 호출 없이 구현하며, 4단계로 나누어 점진적으로 고도화한다.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 15, React 19  
**Primary Dependencies**: Next.js App Router, Drizzle ORM, PostgreSQL, Recharts  
**Storage**: PostgreSQL (기존 테이블 활용, 추가 마이그레이션 없음)  
**Testing**: Vitest + Testing Library (기존 스택 유지)  
**Target Platform**: Web (Next.js App Router)  
**Project Type**: Web application  
**Performance Goals**: 상세 페이지 초기 로드 < 2초, 기존 스크리너 성능 영향 없음  
**Constraints**: 외부 API 호출 없이 기존 DB 데이터만 활용, 기존 컴포넌트/훅 최대한 재사용  
**Scale/Scope**: 4개 Phase로 분할 구현

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- ✅ 기존 데이터 소스(symbols, dailyPrices, dailyMa, quarterlyFinancials, quarterlyRatios) 재사용
- ✅ 기존 Next.js/TypeScript/Drizzle 스택 유지
- ✅ 기존 usePortfolio 훅, formatNumber/formatRatio 유틸 재사용
- ✅ 기존 QuarterlyBarChart 컴포넌트 재사용 가능
- ⚠️ 주가 차트(Phase 4)는 라이브러리 선정 필요

## Project Structure

### Documentation (this feature)

```text
specs/stock-detail-page/
├── plan.md   # This file
├── spec.md   # Feature specification
└── tasks.md  # Task list
```

### Source Code (repository root)

```text
# Phase 1: 기본 구조
apps/web/src/app/stock/[symbol]/
├── page.tsx                    # 상세 페이지 서버 컴포넌트
├── StockDetailClient.tsx       # 클라이언트 컴포넌트
├── loading.tsx                 # 로딩 스켈레톤
└── not-found.tsx               # 404 페이지

apps/web/src/app/api/stock/[symbol]/
└── route.ts                    # 종목 상세 API

apps/web/src/components/stock-detail/
├── StockHeader.tsx             # 헤더 (티커, 회사명, 섹터, 포트폴리오 버튼)
├── PriceCard.tsx               # 가격 정보 카드
├── MAStatusBadge.tsx           # 정배열/골든크로스 뱃지
├── ValuationSection.tsx        # Phase 2: 밸류에이션 지표
├── ProfitabilitySection.tsx    # Phase 2: 수익성 지표
├── QuarterlyCharts.tsx         # Phase 3: 분기별 차트
└── PriceChart.tsx              # Phase 4: 주가 차트

apps/web/src/types/stock-detail.ts  # 상세 페이지 타입 정의

# 기존 파일 수정
apps/web/src/components/screener/StockTable.tsx  # 티커 링크 변경
```

## Key Technical Decisions

### 1) 페이지 구조

- **Decision**: Next.js App Router 동적 라우트 `/stock/[symbol]` 사용
- **Rationale**: URL에서 직접 종목 접근 가능, SEO 친화적, 북마크/공유 용이

### 2) 데이터 페칭

- **Decision**: 서버 컴포넌트에서 직접 DB 조회, 클라이언트 컴포넌트로 전달
- **Rationale**: 초기 로드 성능 최적화, API 호출 오버헤드 제거

### 3) 포트폴리오 상태

- **Decision**: 기존 `usePortfolio` 훅 재사용
- **Rationale**: 코드 중복 방지, 일관된 동작 보장

### 4) 이평선 상태 계산

- **Decision**: 서버에서 MA 비교 후 상태 플래그 전달 (ordered, goldenCross)
- **Rationale**: 클라이언트 계산 부담 감소, 스크리너와 동일한 로직 공유

### 5) 차트 라이브러리 (Phase 3-4)

- **Decision**: Phase 3은 기존 Recharts 활용, Phase 4 주가 차트는 Lightweight Charts 검토
- **Rationale**: Recharts는 이미 사용 중, Lightweight Charts는 금융 차트에 최적화

### 6) 반응형 레이아웃

- **Decision**: Tailwind CSS 반응형 유틸리티 활용, 모바일 우선 설계
- **Rationale**: 기존 프로젝트 스타일 가이드 준수

## Implementation Strategy

### Phase 1: 기본 상세 페이지 (MVP)

1. **라우트 생성**: `/stock/[symbol]` 동적 라우트 및 API 엔드포인트 생성
2. **타입 정의**: `StockDetail` 타입 정의 (기본 정보 + 가격 + MA 상태)
3. **DB 조회 로직**: symbols + dailyPrices + dailyMa 조인 쿼리 구현
4. **헤더 컴포넌트**: 티커, 회사명, 섹터, 포트폴리오 버튼
5. **가격 카드**: 현재가, 시가총액, RS Score, 거래소
6. **MA 상태 뱃지**: 정배열/골든크로스 표시
7. **스크리너 연동**: StockTable 티커 링크를 상세 페이지로 변경
8. **에러 처리**: 404 페이지, 로딩 스켈레톤

### Phase 2: 밸류에이션 & 수익성

1. **API 확장**: quarterlyRatios 데이터 추가 조회
2. **밸류에이션 섹션**: P/E, PEG, P/S, P/B, EV/EBITDA 카드
3. **수익성 섹션**: 마진율 (gross/operating/net) 표시
4. **재무 건전성**: 부채비율, 이자보상배율
5. **배당 정보**: 배당수익률, 배당성향

### Phase 3: 분기별 실적 차트

1. **API 확장**: quarterlyFinancials 히스토리 (최근 8분기) 조회
2. **매출 차트**: 대형 바 차트 (기존 QuarterlyBarChart 확장)
3. **순이익/EPS 차트**: 별도 차트 또는 탭 전환
4. **현금흐름 차트**: 영업현금흐름, 잉여현금흐름

### Phase 4: 주가 차트 & 동종업계 비교

1. **주가 차트**: dailyPrices 히스토리 조회, 캔들스틱/라인 차트
2. **이평선 오버레이**: MA20/50/100/200 토글
3. **기간 선택**: 1M/3M/6M/1Y 필터
4. **동종업계 비교**: 같은 섹터 상위 N개 종목 비교 테이블

## Risk Assessment

| 리스크          | 영향                               | 완화 방안                              |
| --------------- | ---------------------------------- | -------------------------------------- |
| 데이터 누락     | 일부 종목에 ratio/재무 데이터 없음 | 섹션별 "데이터 없음" 처리, 우아한 폴백 |
| 성능 이슈       | 다중 테이블 조인으로 쿼리 느려짐   | 인덱스 확인, 필요 시 캐싱 적용         |
| 차트 라이브러리 | Phase 4 라이브러리 선정 지연       | Phase 3까지 Recharts로 진행, 병렬 검토 |
| ETF/펀드 처리   | 일부 지표가 의미 없음              | isEtf 플래그로 조건부 렌더링           |

## Dependencies

- `symbols`, `dailyPrices`, `dailyMa`, `quarterlyFinancials`, `quarterlyRatios` 테이블 데이터 존재
- 기존 `usePortfolio` 훅, `formatNumber`, `formatRatio`, `formatSector` 유틸
- 기존 `QuarterlyBarChart` 컴포넌트 (Phase 3 확장)
- Recharts 라이브러리 (이미 설치됨)

## Testing Strategy

- **Unit**:

  - `StockDetail` 타입 검증
  - MA 상태 계산 로직 테스트
  - 포맷 유틸 확장 테스트

- **API**:

  - `/api/stock/[symbol]` 응답 스키마 검증
  - 존재하지 않는 심볼 404 응답 확인
  - 필드 null 처리 확인

- **Component**:

  - `StockHeader` 렌더링 테스트
  - `PriceCard` 데이터 표시 테스트
  - 포트폴리오 버튼 토글 테스트

- **Integration/Manual**:

  - 스크리너 → 상세 페이지 네비게이션
  - 모바일 반응형 레이아웃 확인
  - 다양한 종목 데이터 표시 확인

- **Regression**:
  - 기존 스크리너 동작 영향 없음 확인
  - `yarn test` 전체 통과
  - `yarn build` 성공

## External Links (참고용)

- Seeking Alpha: `https://seekingalpha.com/symbol/{symbol}`
- Yahoo Finance: `https://finance.yahoo.com/quote/{symbol}`
- Google Finance: `https://www.google.com/finance/quote/{symbol}:NASDAQ`
