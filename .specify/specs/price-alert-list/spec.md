# 가격 알림 목록 페이지 스펙

**Feature Branch**: `feature/price-alert-list`  
**Created**: 2025-12-03  
**Status**: Completed

## 목표
- 돌파 감지 알림을 받은 종목들을 웹 페이지에서 조회할 수 있는 기능 제공
- 스크리너 테이블과 **완전히 동일한** 테이블 형태로 표시
- 최신 날짜부터 5거래일치를 날짜별로 그룹화하여 세로로 배치

## 정의·범위

### 기능 범위
1. **알림 목록 조회**: `price_alerts` 테이블에서 알림 이력 조회
2. **테이블 표시**: 스크리너 테이블과 **완전히 동일한** 형태로 종목 정보 표시
3. **날짜별 그룹화**: 최신 날짜부터 5거래일치를 날짜별로 테이블을 세로로 배치
4. **정렬 기능**: 스크리너 테이블과 동일한 컬럼별 정렬 지원

### 표시 정보
**스크리너 테이블과 완전히 동일한 컬럼 표시**:
- **#** (index): 순번
- **종목** (symbol): 티커, 클릭 시 종목 상세 페이지로 이동
- **섹터** (sector): 업종
- **시가총액** (market_cap): B/M/K 단위 포맷팅
- **종가** (last_close): 최근 종가
- **RS** (rs_score): 상대강도 점수
- **PER** (pe_ratio): 주가수익비율
- **PEG** (peg_ratio): 성장 대비 밸류에이션
- **매출 (8Q)** (revenue): 최근 8분기 매출 차트
- **EPS (8Q)** (eps): 최근 8분기 EPS 차트
- **액션** (actions): 관심종목 토글 등

**참고**: 알림 데이터(`price_alerts`)를 `ScreenerCompany` 형태로 변환하여 스크리너 테이블과 동일하게 표시

### 데이터 소스
**알림 데이터**:
- `price_alerts`: 알림 이력 (alert_date, symbol, alert_type, condition_data)

**ScreenerCompany 변환을 위한 데이터 소스** (해당 날짜 기준):
- `daily_prices`: 종가 (last_close), RS 점수 (rs_score)
- `symbols`: 시가총액 (market_cap), 섹터 (sector)
- `quarterly_financials`: 최근 8분기 재무 데이터 (revenue, eps_diluted)
- `daily_ratios`: PER (pe_ratio), PEG (peg_ratio)
- `daily_ma`: 정배열 여부 계산 (ordered)

**주의**: `price_alerts`의 `condition_data`만으로는 `ScreenerCompany`를 만들 수 없음. 알림 종목의 `symbol`과 `alert_date`를 기반으로 해당 날짜의 모든 관련 테이블에서 데이터를 조회해야 함.

## 데이터 모델

### 테이블 데이터 구조
- **스크리너 테이블과 동일**: `ScreenerCompany` 타입 사용
- 알림 종목들을 `ScreenerCompany` 형태로 변환하여 표시
- 스크리너 테이블의 모든 컬럼 동일하게 표시:
  - index, symbol, sector, market_cap, last_close, rs_score, pe_ratio, peg_ratio, revenue (chart), eps (chart), actions

### API 응답 타입
```typescript
// 날짜별로 그룹화된 알림 목록
interface AlertsByDate {
  date: string; // 'YYYY-MM-DD'
  alertType: string; // 알림 타입 (예: 'ma20_breakout_ordered')
  alerts: ScreenerCompany[]; // 스크리너 테이블과 동일한 데이터 구조
}

interface AlertsResponse {
  alertsByDate: AlertsByDate[]; // 최신 날짜부터 최대 5거래일치
  totalDates: number; // 전체 알림이 있는 날짜 수
  alertType: string; // 현재 선택된 알림 타입
}
```

## API 엔드포인트

### GET /api/alerts
**쿼리 파라미터**:
- `alertType` (optional): 알림 타입 필터 (기본값: 'ma20_breakout_ordered')
- `maxDates` (optional): 최대 날짜 수 (기본값: 5)

**응답**:
```typescript
{
  alertsByDate: AlertsByDate[]; // 최신 날짜부터 최대 5거래일치
  totalDates: number; // 전체 알림이 있는 날짜 수
  alertType: string; // 현재 선택된 알림 타입
}
```

**동작**:
- 최신 날짜부터 최대 5거래일치의 알림만 조회
- 각 날짜별로 알림 종목들을 `ScreenerCompany` 형태로 변환
- 날짜별로 그룹화하여 반환

**에러 처리**:
- DB 에러: 500 Internal Server Error

## 페이지 구조

### 경로
- `/alerts`: 알림 목록 페이지

### 페이지 컴포넌트 구조
```
/alerts/
  ├── page.tsx              # 서버 컴포넌트 (metadata, Suspense)
  └── AlertsClient.tsx      # 클라이언트 컴포넌트 (필터, 날짜별 그룹화)
      └── AlertTableGroup.tsx   # 날짜별 테이블 그룹 컴포넌트
```

### UI 구성
1. **헤더**: 페이지 제목, 네비게이션 바에 "가격 알림" 링크 포함
2. **알림 타입 필터**: 페이지 상단에 알림 타입 선택 탭 (예: "20일선 돌파 (정배열)")
3. **날짜별 테이블 그룹**: 최신 날짜부터 5거래일치를 세로로 배치
   - 각 날짜별로 독립적인 Card로 구분:
     - 날짜 헤더 (예: "2025-01-15 (수)")
     - 스크리너 테이블과 동일한 테이블 (StockTable 컴포넌트 재사용)
4. **빈 상태**: 알림이 없을 때 표시
5. **로딩 상태**: 데이터 로딩 중 스켈레톤 표시

## 테이블 컬럼 정의

### 컬럼 목록 (스크리너 테이블과 동일)
스크리너 테이블의 `screenerColumns` 정의를 그대로 사용:
1. **#** (index)
2. **종목** (symbol): 클릭 시 종목 상세 페이지로 이동
3. **섹터** (sector)
4. **시가총액** (market_cap)
5. **종가** (last_close)
6. **RS** (rs_score)
7. **PER** (pe_ratio)
8. **PEG** (peg_ratio)
9. **매출 (8Q)** (revenue): 차트
10. **EPS (8Q)** (eps): 차트
11. **액션** (actions): 관심종목 토글 등

### 정렬 가능한 컬럼 (스크리너 테이블과 동일)
- symbol, sector, market_cap, last_close, rs_score, pe_ratio, peg_ratio

## 날짜별 관리

### 날짜별 그룹화 표시
- **최신 날짜부터 5거래일치만** 표시
- 각 날짜별로 독립적인 Card로 구분하여 세로 배치
- 날짜 헤더에 날짜와 요일 표시 (예: "2025-01-15 (수)")
- 각 날짜별 테이블은 스크리너 테이블과 동일한 기능 (정렬, 관심종목 등)
- 기준일 표시 제거 (필터로 이미 알림 타입이 선택되어 있음)

### 데이터 변환
- `price_alerts` 테이블의 알림 데이터를 `ScreenerCompany` 형태로 변환
- 필요한 데이터는 `condition_data` (JSONB)와 `symbols` 테이블에서 조회
- 스크리너 테이블에 필요한 모든 필드 매핑 (market_cap, last_close, rs_score, pe_ratio, peg_ratio, revenue, eps 등)

## 비기능 요구사항

### 성능
- 인덱스 활용: `idx_price_alerts_type_date` 인덱스로 빠른 조회
- 페이지네이션: 기본 100개, 필요시 증가
- JSONB 파싱 최적화: condition_data 파싱은 서버에서 수행

### 에러 처리
- 데이터 없음: 빈 상태 UI 표시
- API 에러: 에러 메시지 표시
- 날짜 파싱 에러: 기본값(최신 날짜)으로 폴백

### 접근성
- 테이블 헤더에 적절한 라벨
- 키보드 네비게이션 지원
- 스크린 리더 호환

## 예시 / 수락 기준

### API 테스트
- [x] 최신 날짜부터 최대 5거래일치 알림 반환
- [x] 날짜별로 그룹화되어 반환되는지 확인
- [x] 알림 데이터가 ScreenerCompany 형태로 변환되는지 확인
- [x] 알림 없을 때 빈 배열 반환
- [x] 알림 타입별 필터링 동작 확인

### UI 테스트
- [x] 날짜별로 테이블이 세로로 배치되는지 확인
- [x] 각 날짜별 테이블이 스크리너 테이블과 동일하게 표시되는지 확인
- [x] 날짜 헤더가 올바르게 표시되는지 확인
- [x] 컬럼 정렬 동작 확인 (스크리너 테이블과 동일)
- [x] 티커 클릭 시 종목 상세 페이지 이동
- [x] 빈 상태 UI 표시 확인
- [x] 로딩 상태 스켈레톤 표시 확인
- [x] 알림 타입 필터 동작 확인
- [x] 날짜별 Card 구분 확인
- [x] 네비게이션 링크 동작 확인

### 통합 테스트
- [x] 실제 데이터로 전체 플로우 테스트
- [x] 날짜별 그룹화 동작 확인
- [x] 스크리너 테이블과 동일한 기능 동작 확인
- [x] 알림 타입 필터링 동작 확인

## 구현 완료 사항

### 완료된 기능
- ✅ 알림 타입별 필터링 (FilterTabs로 선택)
- ✅ 날짜별 Card 구분 표시
- ✅ 네비게이션 바에 "가격 알림" 링크 추가
- ✅ 기준일 표시 제거 (필터로 대체)
- ✅ 상단 마진 최적화

## 향후 확장

### 추가 기능
- 다중 날짜 선택 (기간 조회)
- 알림 상세 정보 모달
- 알림 효과 분석 (돌파 후 수익률 추적)
- CSV 내보내기 기능
- 알림 타입별 통계 표시

### 성능 개선
- 무한 스크롤 (현재는 페이지네이션)
- 클라이언트 사이드 캐싱
- 날짜별 그룹화 표시 옵션

