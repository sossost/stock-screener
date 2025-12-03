# 가격 알림 목록 페이지 구현 계획

**Branch**: `feature/price-alert-list` | **Date**: 2025-12-03 | **Plan**: [link]  
**Input**: 가격 알림 목록 페이지 스펙 및 작업 목록 기반 구현 계획

## Technical Context

### Current System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Price Alerts   │    │   API Endpoint  │    │   Frontend      │
│   (ETL)         │───▶│   /api/alerts   │───▶│   /alerts       │
│                 │    │                 │    │                 │
│ - detect-alerts │    │ - Query alerts  │    │ - FilterTabs    │
│ - Store in DB   │    │ - Transform to │    │ - AlertTable    │
│                 │    │   ScreenerCo   │    │ - Date grouping │
└─────────────────┘    └─────────────────┘    └─────────────────┘
     매일 08:30 KST          데이터 조회/변환         UI 표시
     (23:30 UTC)             (ScreenerCompany)      (날짜별 그룹)
```

### Target Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  price_alerts   │    │   /api/alerts   │    │   /alerts       │
│   table         │───▶│                 │───▶│                 │
│                 │    │ - Get dates     │    │ - FilterTabs    │
│ - alert_date    │    │ - Get symbols   │    │   (alert type)  │
│ - symbol        │    │ - Join tables   │    │ - Date Cards    │
│ - alert_type    │    │ - Transform     │    │ - StockTable    │
│                 │    │   to ScreenerCo │    │   (reuse)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
     PostgreSQL              Next.js API           Next.js Page
```

## Constitution Check

### Performance-First ✅

- 인덱스 활용: `idx_price_alerts_type_date` 인덱스로 빠른 조회
- 날짜별 그룹화로 필요한 데이터만 조회
- API 응답 캐싱 (Next.js 캐시 헤더)

### Data Integrity ✅

- 해당 날짜(`alert_date`) 기준으로 정확한 데이터 조회
- `ScreenerCompany` 변환 시 모든 필드 정확히 매핑
- 에러 처리 및 빈 상태 처리

### Modular & Maintainable ✅

- 기존 `StockTable` 컴포넌트 재사용
- `ScreenerCompany` 타입 재사용으로 일관성 유지
- 필터링 로직 분리 (API 레이어)
- 날짜별 그룹화 컴포넌트 분리

## Project Structure

```
apps/web/src/
├── app/
│   ├── api/
│   │   └── alerts/
│   │       ├── route.ts                    # API 엔드포인트 (GET /api/alerts)
│   │       └── __tests__/
│   │           └── route.test.ts           # API 테스트
│   └── alerts/
│       └── page.tsx                        # 페이지 컴포넌트 (서버 컴포넌트)
├── components/
│   ├── alerts/
│   │   ├── AlertsClient.tsx                # 클라이언트 컴포넌트 (필터, 데이터 페칭)
│   │   ├── AlertTableGroup.tsx             # 날짜별 그룹 컴포넌트 (날짜 헤더 + StockTable)
│   │   └── __tests__/
│   │       ├── AlertsClient.test.tsx       # AlertsClient 테스트
│   │       └── AlertTableGroup.test.tsx    # AlertTableGroup 테스트
│   └── navigation.tsx                      # 네비게이션 (알림 링크 추가)
└── lib/
    └── alerts/
        └── constants.ts                    # 알림 타입 상수 및 라벨 (ALERT_TYPES, ALERT_TYPE_LABELS)
```

## Research

### 데이터 변환 전략

**문제**: `price_alerts` 테이블에는 `symbol`과 `alert_date`만 있고, `ScreenerCompany`에 필요한 모든 데이터는 다른 테이블에 있음.

**해결책**: 해당 날짜(`alert_date`) 기준으로 모든 관련 테이블 조인
- `daily_prices`: 종가, RS 점수
- `symbols`: 시가총액, 섹터
- `quarterly_financials`: 최근 8분기 재무 데이터
- `daily_ratios`: PER, PEG
- `daily_ma`: 정배열 여부

**참고**: 스크리너 API의 쿼리 패턴 재사용

### 날짜별 그룹화 전략

**방식**: 최신 날짜부터 5거래일치만 조회하여 날짜별로 그룹화
- API에서 날짜별로 `ScreenerCompany[]` 배열 반환
- 프론트엔드에서 각 날짜별로 Card로 구분하여 표시

### 필터링 전략

**방식**: 알림 타입별 필터링
- 페이지 상단에 `FilterTabs`로 알림 타입 선택
- 선택한 타입에 따라 API 호출
- 날짜 헤더 옆의 알림 타입 배지 제거 (필터로 이미 선택됨)

## Data Models

### API Response

```typescript
interface AlertsByDate {
  date: string; // 'YYYY-MM-DD'
  alertType: string; // 'ma20_breakout_ordered'
  alerts: ScreenerCompany[]; // 스크리너 테이블과 동일
}

interface AlertsResponse {
  alertsByDate: AlertsByDate[];
  totalDates: number;
  alertType: string;
}
```

## Implementation Phases

### Phase 1: API 엔드포인트 구현 (완료)

**목표**: 알림 데이터를 조회하고 `ScreenerCompany` 형태로 변환

**작업 내역**:
1. `/api/alerts` 엔드포인트 구현
2. 날짜별 알림 조회 로직
3. `ScreenerCompany` 변환 로직 (복잡한 조인 쿼리)
4. 알림 타입 필터링 지원
5. API 테스트 작성

**성공 기준**:
- ✅ 최신 날짜부터 5거래일치 알림 반환
- ✅ 날짜별로 그룹화되어 반환
- ✅ 알림 데이터가 `ScreenerCompany` 형태로 변환
- ✅ 알림 타입별 필터링 동작

### Phase 2: 프론트엔드 컴포넌트 구현 (완료)

**목표**: 날짜별로 그룹화된 알림 테이블 표시

**작업 내역**:
1. `/alerts` 페이지 컴포넌트 (`page.tsx`)
2. `AlertsClient` 컴포넌트 (필터, 데이터 페칭)
3. `AlertTableGroup` 컴포넌트 (날짜별 그룹화)
4. 알림 타입 필터 (`FilterTabs`)
5. 빈 상태/에러 상태 처리
6. 컴포넌트 테스트 작성

**성공 기준**:
- ✅ 날짜별로 테이블이 세로로 배치
- ✅ 각 날짜별 테이블이 스크리너 테이블과 동일하게 표시
- ✅ 알림 타입 필터 동작
- ✅ 날짜별 Card 구분 표시

### Phase 3: 네비게이션 및 UI 개선 (완료)

**목표**: 페이지 접근성 및 사용성 개선

**작업 내역**:
1. 네비게이션 바에 "가격 알림" 링크 추가
2. 기준일 표시 제거 (필터로 대체)
3. 상단 마진 최적화
4. 날짜 헤더에서 중복 알림 타입 배지 제거

**성공 기준**:
- ✅ 네비게이션에서 알림 페이지 접근 가능
- ✅ 레이아웃 최적화 완료
- ✅ 중복 정보 제거

## Risk Assessment

### 기술적 리스크

1. **복잡한 조인 쿼리 성능**
   - **영향**: API 응답 시간 증가
   - **완화**: 인덱스 활용, 날짜별 제한 (5거래일치), 캐싱

2. **데이터 타입 불일치**
   - **영향**: 쿼리 에러 (text vs date)
   - **완화**: 스키마 확인 후 올바른 타입 캐스팅

3. **빈 데이터 처리**
   - **영향**: UI 에러 또는 빈 화면
   - **완화**: 빈 상태 UI 구현, 에러 처리

### 비즈니스 리스크

1. **데이터 정확성**
   - **영향**: 잘못된 정보 표시
   - **완화**: 해당 날짜 기준으로 정확히 조회, 테스트로 검증

2. **사용자 경험**
   - **영향**: 필터링/그룹화가 불명확
   - **완화**: 명확한 UI (FilterTabs, 날짜별 Card), 사용자 피드백 반영

## Success Metrics

### 기능적 메트릭

- ✅ 알림 목록 조회 성공률: 100%
- ✅ 날짜별 그룹화 정확도: 100%
- ✅ 데이터 변환 정확도: 100% (`ScreenerCompany` 매핑)

### 비기능 메트릭

- API 응답 시간: 2초 이하 (날짜별 조회)
- 페이지 로딩 시간: 3초 이하
- 테스트 커버리지: 80% 이상

## Future Enhancements

### 추가 기능

- 다중 날짜 선택 (기간 조회)
- 알림 상세 정보 모달
- 알림 효과 분석 (돌파 후 수익률 추적)
- CSV 내보내기 기능
- 알림 타입별 통계 표시

### 성능 개선

- 무한 스크롤 (현재는 5거래일치 제한)
- 클라이언트 사이드 캐싱
- 날짜별 그룹화 표시 옵션 (카드/탭)

## Dependencies

### 기존 패키지

- Next.js 15 (App Router)
- Drizzle ORM
- React Query (TanStack Query)
- shadcn/ui 컴포넌트

### 새로운 패키지

없음 (기존 패키지만 사용)

## Timeline

- **Day 1**: Phase 1 (API 엔드포인트 구현)
- **Day 2**: Phase 2 (프론트엔드 컴포넌트 구현)
- **Day 3**: Phase 3 (네비게이션 및 UI 개선)

**총 소요 기간**: 3일

## Notes

- 기존 `StockTable` 컴포넌트 재사용으로 빠른 구현
- `ScreenerCompany` 타입 재사용으로 일관성 유지
- 해당 날짜 기준으로 정확한 데이터 조회 (알림 발생 시점의 데이터)
- 사용자 피드백 반영하여 UI 개선 (필터 위치, Card 구분, 마진 조정)

