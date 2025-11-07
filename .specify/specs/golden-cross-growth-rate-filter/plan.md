# Implementation Plan: Golden Cross 스크리너 성장률 필터 기능

**Branch**: `feature/golden-cross-growth-rate-filter` | **Date**: 2025-11-04 | **Spec**: [spec.md](./spec.md)

## Summary

기존 연속 성장 분기 수 필터를 확장하여, **선택한 N분기 동안 평균 성장률이 X% 이상**인 기업을 필터링하는 기능을 추가합니다.

**주요 변경사항**:

- 매출 성장률 필터: N분기 평균 매출 성장률 X% 이상
- EPS 성장률 필터: N분기 평균 EPS 성장률 X% 이상
- SQL 쿼리에 LAG 함수로 분기별 성장률 계산 → 평균 계산
- UI에 성장률 % 입력 필드 추가

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 14+  
**Dependencies**: Drizzle ORM, PostgreSQL, React  
**Storage**: PostgreSQL (`quarterly_financials` 테이블)  
**Performance**: 필터 적용 시 3초 이내 응답

## Data Models

### API Request Parameters

```typescript
// 신규 파라미터 추가
revenueGrowthRate?: string; // 0-1000, 기본값 30
incomeGrowthRate?: string; // 0-1000, 기본값 30
```

### API Response Type

```typescript
// 신규 필드 추가
revenue_avg_growth_rate: number | null; // 평균 매출 성장률 (%)
income_avg_growth_rate: number | null; // 평균 EPS 성장률 (%)
```

## SQL Query Logic

**핵심 로직**:

- LAG 함수로 이전 분기 값과 비교
- 분기별 성장률 = (현재 - 이전) / 이전 × 100
- AVG로 평균 성장률 계산
- 필터링: `revenue_avg_growth_rate >= revenueGrowthRate`

## Implementation Phases

### Phase 1: 백엔드 API 수정

- SQL 쿼리에 평균 성장률 계산 로직 추가 (LAG 함수 사용)
- API 파라미터: `revenueGrowthRate`, `incomeGrowthRate` 추가
- 응답 필드: `revenue_avg_growth_rate`, `income_avg_growth_rate` 추가

### Phase 2: 프론트엔드 UI 수정

- `GrowthFilterControls`: 성장률 % 입력 필드 추가
- `GoldenCrossClient`: 성장률 파라미터 관리
- `DataWrapper`: 파라미터 전달 및 캐시 태그 업데이트

### Phase 3: 타입 정의 및 테스트

- 타입 정의 업데이트
- 엣지 케이스 처리 (0, NULL, 음수→양수)
- 성능 및 사용성 검증

## Success Criteria

- [ ] 매출/EPS 성장률 필터 정상 작동 (기본값: 3분기, 30%)
- [ ] 복합 필터 조합 정상 작동
- [ ] 엣지 케이스 처리 확인
- [ ] 응답 시간 3초 이내
