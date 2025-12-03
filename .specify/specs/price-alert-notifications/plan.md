# 가격 알림 시스템 구현 계획

**Branch**: `price-alert-notifications` | **Date**: 2025-12-03 | **Plan**: [link]  
**Input**: 가격 알림 시스템 스펙 및 작업 목록 기반 구현 계획

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
                    │   Notification Service  │
                    │                         │
                    │  ┌──────────────────┐  │
                    │  │  Email (Resend)   │──┼──▶ User Email
                    │  └──────────────────┘  │
                    │                         │
                    │  ┌──────────────────┐  │
                    │  │  App Service     │──┼──▶ Next.js API
                    │  │  (우리 앱)        │  │     /api/notifications
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
- 알림 채널 독립적 관리 (앱/이메일 - 초기 구현)
- 환경 변수로 활성화/비활성화 제어
- 향후 추가 채널 확장 용이 (SMS, 슬랙, 텔레그램 등)

## Project Structure

```
apps/web/src/
├── db/
│   └── schema.ts                      # + priceAlerts, deviceTokens 테이블
├── lib/
│   └── alerts/
│       ├── constants.ts               # NEW: 알림 타입 상수
│       ├── types.ts                   # NEW: AlertData 타입
│       └── notifications/
│           ├── email.ts               # NEW: 이메일 전송
│           └── push.ts                # NEW: 푸시 알림 전송 (Expo)
├── etl/
│   ├── jobs/
│   │   └── detect-price-alerts.ts    # NEW: 알림 감지 ETL
│   └── utils/
│       └── date-helpers.ts            # NEW: 거래일 조회 유틸
└── app/
    └── api/
        └── notifications/
            ├── alerts/
            │   └── route.ts           # NEW: 알림 조회 API
            ├── register-device/
            │   └── route.ts           # NEW: 디바이스 토큰 등록 API
            └── send/
                └── route.ts           # NEW: 알림 전송 API

apps/mobile/
├── src/
│   ├── services/
│   │   └── notifications.ts          # NEW: 푸시 알림 서비스
│   ├── hooks/
│   │   └── usePushNotifications.ts  # NEW: 푸시 알림 훅
│   └── screens/
│       └── NotificationScreen.tsx    # NEW: 알림 목록 화면 (선택사항)
├── app.json                           # + 푸시 알림 설정
└── package.json                       # + expo-notifications 패키지

.github/workflows/
└── etl-daily.yml                      # + detect-alerts 단계 추가

.env.local
+ ENABLE_PRICE_ALERTS=true
+ ALERT_CHANNELS=app,email
+ RESEND_API_KEY=re_xxxxx
+ NOTIFICATION_EMAIL_FROM=noreply@screener.com
+ NOTIFICATION_EMAIL_TO=user@example.com
+ EXPO_ACCESS_TOKEN=xxxxx (선택사항, EAS Push 사용 시)
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

### Phase 1: 알림 감지 로직 (P1)

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

### Phase 2: 이메일 알림 전송 (P1)

**목표**: 감지된 알림을 이메일로 전송

**작업 내역**:

1. Resend 패키지 설치
   - `yarn workspace web add resend`

2. 이메일 전송 함수 구현
   - `lib/notifications/email.ts`
   - HTML 템플릿 작성

3. 환경 변수 설정
   - `RESEND_API_KEY`
   - `NOTIFICATION_EMAIL_FROM`
   - `NOTIFICATION_EMAIL_TO`

4. ETL에 이메일 전송 통합
   - `detect-price-alerts.ts`에서 `sendEmailAlert()` 호출

**성공 기준**:
- 실제 이메일 수신 확인
- 알림 내용 정확성 확인
- 에러 발생 시 로깅 및 ETL 계속 진행

### Phase 3: 앱 푸시 알림 구현 (P1)

**목표**: 모바일 앱에서 푸시 알림 수신 및 표시 기능 구현

**작업 내역**:

1. **백엔드: 푸시 알림 API 구현**
   - `app/api/notifications/alerts/route.ts`: 알림 조회 API
   - `app/api/notifications/register-device/route.ts`: 디바이스 푸시 토큰 등록 API
   - `app/api/notifications/send/route.ts`: ETL에서 호출하여 알림 저장 및 푸시 전송
   - `price_alerts` 테이블 생성 (알림 이력 저장)
   - `device_tokens` 테이블 생성 (푸시 토큰 관리)

2. **모바일 앱: 푸시 알림 설정**
   - `expo-notifications` 패키지 설치
   - 푸시 알림 권한 요청
   - 푸시 토큰 등록 (백엔드 API 호출)
   - 포그라운드/백그라운드 알림 수신 처리
   - 알림 클릭 시 상세 화면 이동

3. **ETL 통합**
   - `detect-price-alerts.ts`에서 푸시 알림 전송
   - Expo Push Notification Service (EAS) 연동

**성공 기준**:
- API 엔드포인트 정상 동작
- 모바일 앱에서 푸시 알림 수신 확인
- 알림 클릭 시 적절한 화면 이동
- 백그라운드/포그라운드 모두에서 알림 수신

### Phase 4: GitHub Actions 통합 (P1)

**목표**: 일일 ETL 완료 후 자동으로 알림 감지 및 전송

**작업 내역**:

1. GitHub Actions 워크플로우 수정
   - `.github/workflows/etl-daily.yml`
   - `detect-alerts` 단계 추가
   - `continue-on-error: true` 설정

2. 환경 변수 설정
   - GitHub Secrets에 이메일 관련 변수 추가
   - Expo Push Notification 관련 변수 추가 (선택사항)

**성공 기준**:
- GitHub Actions에서 자동 실행 확인
- 이메일 및 푸시 알림 전송 확인

### Phase 5: 테스트 및 검증 (P1)

**목표**: 전체 시스템 검증 및 버그 수정

**작업 내역**:

1. 로컬 테스트
   - 테스트 데이터로 조건 감지 확인
   - 이메일 전송 테스트
   - 중복 알림 방지 확인

2. 프로덕션 검증
   - 실제 ETL 실행 후 알림 전송 확인
   - 알림 내용 정확성 확인

3. 문서화
   - README 업데이트
   - 환경 변수 가이드 작성

**성공 기준**:
- 모든 테스트 통과
- 프로덕션에서 정상 동작 확인

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

**초기 구현 범위**: 앱 서비스 + 이메일만 지원

**향후 확장 가능한 채널**:
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
- `expo-server-sdk`: Expo 푸시 알림 전송 (서버 사이드)
- 선택사항: `@aws-sdk/client-ses` (AWS SES 사용 시)

**Mobile (apps/mobile)**:
- `expo-notifications`: 푸시 알림 수신 및 관리
- `expo-device`: 디바이스 정보 조회

### 환경 변수

- `ENABLE_PRICE_ALERTS`: 알림 활성화 여부
- `ALERT_CHANNELS`: 알림 채널 (app,email)
- `RESEND_API_KEY`: Resend API 키
- `NOTIFICATION_EMAIL_FROM`: 발신자 이메일
- `NOTIFICATION_EMAIL_TO`: 수신자 이메일 (쉼표 구분)

## Notes

- ✅ **초기 구현 범위**: 앱 서비스 + 이메일 알림만 지원 - 완료
- ✅ 초기 구현은 최소 기능으로 시작 (MVP) - 완료
- ✅ 향후 확장을 고려한 모듈화된 구조 (SMS, 슬랙, 텔레그램 등 추가 용이)
- ✅ 에러 발생 시에도 ETL은 정상 완료 (Graceful Degradation)
- ✅ 알림 이력 테이블은 DB 테이블로 구현 완료 (`price_alerts`)

## 구현 완료 사항 (2025-12-03)

- ✅ 알림 감지 로직 구현 (`detect-price-alerts.ts`)
- ✅ 이메일 알림 전송 (Resend, 종합 이메일 형식)
- ✅ 모바일 푸시 알림 전송 (Expo Push Notification Service)
- ✅ GitHub Actions 통합 (일일 ETL에 알림 감지 단계 추가)
- ✅ 중복 알림 방지 (DB 테이블 기반)
- ✅ 타임아웃 및 재시도 로직 (지수 백오프)
- ✅ 실제 데이터로 테스트 완료 (35개 종목)

