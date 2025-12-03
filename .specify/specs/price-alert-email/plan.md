# 가격 알림 시스템 (이메일) 구현 계획

**Branch**: `price-alert-email` | **Date**: 2025-12-03 | **Plan**: [link]  
**Input**: 가격 알림 시스템 (이메일) 스펙 및 작업 목록 기반 구현 계획

## Technical Context

### Current System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  GitHub Actions │    │   ETL Scripts   │    │   PostgreSQL    │
│                 │───▶│                 │───▶│                 │
│ - Daily Prices  │    │ - load-daily-   │    │ - daily_prices  │
│ - Daily MA      │    │   prices.ts     │    │ - daily_ma      │
│ - Daily Ratios  │    │ - build-daily-  │    │ - daily_ratios  │
│                 │    │   ma.ts         │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
     매일 08:30 KST          데이터 수집/계산         데이터 저장
     (23:30 UTC)             (수동 실행)             (최신 데이터)
```

### Target Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  GitHub Actions │    │   ETL Scripts   │    │   PostgreSQL    │
│                 │───▶│                 │───▶│                 │
│ - Daily Prices  │    │ - load-daily-   │    │ - daily_prices  │
│ - Daily MA      │    │   prices.ts     │    │ - daily_ma      │
│                 │    │ - build-daily-  │    │ - price_alerts  │
│                 │    │   ma.ts         │    │   (NEW)         │
│                 │    │ - detect-price- │    │                 │
│                 │    │   alerts.ts     │    │                 │
│                 │    │   (NEW)         │    │                 │
└─────────────────┘    └────────┬────────┘    └─────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │   Email Notification     │
                    │                         │
                    │  ┌──────────────────┐  │
                    │  │  Email (Resend)   │──┼──▶ User Email
                    │  └──────────────────┘  │
                    │                         │
                    │  (향후 확장: SMS, 슬랙,  │
                    │   텔레그램 등)          │
                    └─────────────────────────┘
```

## Constitution Check

### Performance-First ✅

- 알림 감지 쿼리는 기존 인덱스 활용 (추가 인덱스 불필요)
- 알림 전송은 비동기 처리 (ETL 블로킹 방지)
- 중복 알림 방지로 불필요한 전송 최소화

### Data Integrity ✅

- 정배열 및 돌파 조건을 정확히 감지
- 전일 데이터 검증으로 오탐지 방지
- 알림 이력 저장으로 추적 가능

### Modular & Maintainable ✅

- 모듈화된 알림 조건 (향후 확장 용이)
- 알림 채널 독립적 관리 (이메일 - 초기 구현)
- 환경 변수로 활성화/비활성화 제어
- 향후 추가 채널 확장 용이 (SMS, 슬랙, 텔레그램 등)

## Project Structure

```
apps/web/src/
├── db/
│   └── schema.ts                      # + priceAlerts 테이블 (선택사항)
├── lib/
│   └── alerts/
│       ├── constants.ts               # NEW: 알림 타입 상수
│       ├── types.ts                   # NEW: AlertData 타입
│       └── notifications/
│           └── email.ts               # NEW: 이메일 전송
├── etl/
│   ├── jobs/
│   │   └── detect-price-alerts.ts    # NEW: 알림 감지 ETL
│   └── utils/
│       └── date-helpers.ts            # NEW: 거래일 조회 유틸

.github/workflows/
└── etl-daily.yml                      # + detect-alerts 단계 추가

.env.local
+ ENABLE_PRICE_ALERTS=true
+ ALERT_CHANNELS=email
+ RESEND_API_KEY=re_xxxxx
+ NOTIFICATION_EMAIL_FROM=noreply@screener.com
+ NOTIFICATION_EMAIL_TO=user@example.com
```

## Research

### 이메일 서비스 옵션

1. **Resend** (권장)
   - Next.js 공식 파트너
   - 간단한 API, 무료 티어 제공
   - 트랜잭션 이메일 특화
   - 설치: `yarn add resend`

2. **AWS SES**
   - 저렴한 비용, 높은 신뢰성
   - AWS 인프라와 통합 용이
   - 설정이 다소 복잡
   - 설치: `yarn add @aws-sdk/client-ses`

3. **SendGrid**
   - 널리 사용되는 서비스
   - 무료 티어 제공
   - 설치: `yarn add @sendgrid/mail`

**선택**: Resend (간단한 설정, Next.js 친화적)

### 알림 전송 전략

1. **동기 전송** (초기 구현)
   - ETL에서 직접 이메일 전송
   - 간단하지만 ETL 지연 가능
   - 에러 처리 필요

2. **비동기 큐** (향후 확장)
   - BullMQ, Redis Queue 사용
   - 재시도 로직, 우선순위 큐
   - 확장성 높음

**초기 구현**: 동기 전송 (간단함), 향후 큐로 전환 가능

### 중복 알림 방지 전략

1. **데이터베이스 테이블** (권장)
   - `price_alerts` 테이블에 기록
   - 영구 저장, 조회 가능
   - UNIQUE 제약으로 중복 방지

2. **메모리 캐시** (초기 구현 대안)
   - 간단한 Set/Map 사용
   - 서버 재시작 시 초기화
   - 빠른 구현 가능

**초기 구현**: 메모리 캐시 (간단함), 향후 DB 테이블로 전환

## Data Models

### AlertData (TypeScript)

```typescript
interface AlertData {
  symbol: string;
  companyName: string;
  alertType: 'ma20_breakout_ordered';
  todayClose: number;
  todayMa20: number;
  todayMa50: number;
  todayMa100: number;
  todayMa200: number;
  prevClose: number;
  prevMa20: number;
  breakoutPercent: number; // (todayClose / prevMa20 - 1) * 100
  date: string; // 'YYYY-MM-DD'
}
```

### price_alerts (Database Schema, 선택사항)

```sql
CREATE TABLE price_alerts (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL REFERENCES symbols(symbol),
  alert_type TEXT NOT NULL,
  alert_date DATE NOT NULL,
  condition_data JSONB,
  notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notification_channels TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, alert_type, alert_date)
);
```

## Implementation Phases

### Phase 1: 알림 감지 로직 (P1) - Day 1-2

**목표**: 정배열 상태에서 20일선 돌파 감지 및 로깅

**작업 내역**:

1. 알림 타입 및 데이터 타입 정의
   - `lib/alerts/constants.ts`
   - `lib/alerts/types.ts`

2. 거래일 조회 유틸리티
   - `etl/utils/date-helpers.ts`
   - `getLatestTradeDate()`, `getPreviousTradeDate()`

3. 알림 감지 ETL 구현
   - `etl/jobs/detect-price-alerts.ts`
   - SQL 쿼리로 조건 감지
   - 중복 알림 방지 (메모리 캐시)

4. package.json 스크립트 추가
   - `yarn etl:detect-alerts`

**성공 기준**:
- ETL 실행 시 조건에 맞는 종목 감지
- 콘솔에 알림 정보 출력
- 중복 알림 방지 확인

<!-- Phase 2-4는 Phase 1 완료 후 진행 (Git stash에 저장됨) -->

## Risk Assessment

### 기술적 리스크

1. **이메일 서비스 장애**
   - **영향**: 알림 미전송
   - **완화**: 에러 로깅, ETL은 계속 진행, 재시도 로직 (향후)

2. **알림 감지 쿼리 성능**
   - **영향**: ETL 지연
   - **완화**: 기존 인덱스 활용, 쿼리 최적화

3. **중복 알림 전송**
   - **영향**: 사용자 불편
   - **완화**: 중복 방지 로직, UNIQUE 제약

### 비즈니스 리스크

1. **오탐지 (False Positive)**
   - **영향**: 불필요한 알림
   - **완화**: 조건 정확성 검증, 테스트 데이터로 검증

2. **미탐지 (False Negative)**
   - **영향**: 중요한 신호 놓침
   - **완화**: 조건 로직 검증, 실제 데이터로 테스트

## Success Metrics

### 기능적 메트릭

- 알림 감지 정확도: 100% (조건에 맞는 종목 모두 감지)
- 중복 알림 비율: 0% (같은 종목, 같은 날 1회만)
- 알림 전송 성공률: 95% 이상

### 비기능 메트릭

- 알림 감지 쿼리 실행 시간: 5초 이하
- ETL 전체 실행 시간 증가: 10초 이하
- 이메일 전송 지연: 2초 이하 (종목당)

## Future Enhancements

### 추가 알림 조건

- 골든크로스 감지 (ma50 > ma200)
- 거래량 급증 감지 (평균 대비 200% 이상)
- RSI 과매수/과매도 구간 진입
- 지지선/저항선 돌파

### 알림 채널 확장 (향후 구현)

**초기 구현 범위**: 이메일만 지원

**향후 확장 가능한 채널**:
- 앱 푸시 알림 (별도 피쳐: `price-alert-push`)
- SMS 알림 (Twilio)
- 슬랙 알림 (Slack Webhook)
- 텔레그램 알림 (Telegram Bot)
- 기타 메시징 서비스

### 알림 설정

- 사용자별 알림 조건 커스터마이징
- 알림 빈도 설정 (즉시/일일 요약/주간 요약)
- 알림 이력 조회 UI

### 알림 분석

- 알림 효과 분석 (돌파 후 수익률 추적)
- 알림 통계 (조건별 발생 빈도)
- 백테스팅 (과거 데이터로 알림 효과 검증)

## Dependencies

### 새로운 패키지

**Web (apps/web)**:
- `resend`: 이메일 전송 (Resend 서비스)
- 선택사항: `@aws-sdk/client-ses` (AWS SES 사용 시)

### 환경 변수

- `ENABLE_PRICE_ALERTS`: 알림 활성화 여부
- `ALERT_CHANNELS`: 알림 채널 (email)
- `RESEND_API_KEY`: Resend API 키
- `NOTIFICATION_EMAIL_FROM`: 발신자 이메일
- `NOTIFICATION_EMAIL_TO`: 수신자 이메일 (쉼표 구분)

## Timeline

- **Day 1-2**: Phase 1 (알림 감지 로직)
- **Day 2-3**: Phase 2 (이메일 알림)
- **Day 3-4**: Phase 3 (GitHub Actions 통합)
- **Day 4-5**: Phase 4 (테스트 및 검증)

**총 예상 기간**: 5일

## Notes

- **초기 구현 범위**: 이메일 알림만 지원
- 초기 구현은 최소 기능으로 시작 (MVP)
- 향후 확장을 고려한 모듈화된 구조 (SMS, 슬랙, 텔레그램 등 추가 용이)
- 에러 발생 시에도 ETL은 정상 완료 (Graceful Degradation)
- 알림 이력 테이블은 선택사항 (초기에는 메모리 캐시 사용 가능)

