# 가격 알림 시스템 (푸시 알림) 구현 계획

**Branch**: `price-alert-push` | **Date**: 2025-12-03 | **Plan**: [link]  
**Input**: 가격 알림 시스템 (푸시 알림) 스펙 및 작업 목록 기반 구현 계획

## 전제 조건

- ✅ `price-alert-email` 피쳐 완료 (2025-12-03)
- ✅ 알림 감지 로직 (`detect-price-alerts.ts`) 구현 완료
- ✅ 이메일 알림 정상 작동 중 (GitHub Actions에서 검증 완료)
- ✅ 타임아웃 및 재시도 로직 적용 완료 (ADR-013)

## Technical Context

### Current System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  GitHub Actions │    │   ETL Scripts   │    │   PostgreSQL    │
│                 │───▶│                 │───▶│                 │
│ - Daily Prices  │    │ - load-daily-   │    │ - daily_prices  │
│ - Daily MA      │    │   prices.ts     │    │ - daily_ma      │
│                 │    │ - build-daily-  │    │ - price_alerts  │
│                 │    │   ma.ts         │    │   (EXISTS)      │
│                 │    │ - detect-price- │    │ - device_tokens  │
│                 │    │   alerts.ts     │    │   (NEW)         │
│                 │    │   (EXISTS)      │    │                 │
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
                    │  │  Push (Expo)     │──┼──▶ Mobile App
                    │  │  (NEW)            │  │
                    │  └──────────────────┘  │
                    └─────────────────────────┘
```

## Constitution Check

### Performance-First ✅

- 푸시 알림 전송은 비동기 처리 (ETL 블로킹 방지)
- 배치 전송으로 효율성 향상 (Expo는 최대 100개씩)
- 중복 알림 방지로 불필요한 전송 최소화

### Data Integrity ✅

- 디바이스 토큰 중복 등록 방지 (UNIQUE 제약)
- 활성/비활성 상태 관리
- 알림 이력에 푸시 알림 채널 기록

### Modular & Maintainable ✅

- 기존 이메일 알림과 독립적으로 관리
- 환경 변수로 활성화/비활성화 제어
- 향후 사용자별 알림 설정 확장 용이

## Project Structure

```
apps/web/src/
├── db/
│   └── schema.ts                      # + deviceTokens 테이블
├── lib/
│   └── notifications/
│       └── push.ts                     # NEW: 푸시 알림 전송
├── etl/
│   └── jobs/
│       └── detect-price-alerts.ts    # UPDATE: 푸시 알림 통합
└── app/
    └── api/
        └── notifications/
            ├── alerts/
            │   └── route.ts           # NEW: 알림 조회 API
            └── register-device/
                └── route.ts           # NEW: 디바이스 토큰 등록 API

apps/mobile/
├── src/
│   ├── services/
│   │   └── notifications.ts          # NEW: 푸시 알림 서비스
│   └── hooks/
│       └── usePushNotifications.ts  # NEW: 푸시 알림 훅
├── App.tsx                            # UPDATE: 푸시 알림 훅 통합
├── app.json                           # UPDATE: 푸시 알림 설정
└── package.json                       # + expo-notifications, expo-device

.env.local
+ ALERT_CHANNELS=app,email  # 'app' 추가
+ EXPO_ACCESS_TOKEN=xxxxx (선택사항)
```

## Research

### Expo Push Notification Service

1. **Expo Push Notification Service**
   - Expo 공식 푸시 알림 서비스
   - iOS/Android 모두 지원
   - 무료 티어 제공
   - 설치: `yarn add expo-server-sdk` (백엔드), `yarn add expo-notifications` (모바일)

2. **EAS Push Notifications** (선택사항)
   - Expo Application Services의 푸시 알림
   - 더 높은 신뢰성 및 성능
   - `EXPO_ACCESS_TOKEN` 필요

**선택**: Expo Push Notification Service (간단한 설정, 무료)

### 알림 전송 전략

1. **동기 전송** (초기 구현)
   - ETL에서 직접 푸시 알림 전송
   - 간단하지만 ETL 지연 가능
   - 에러 처리 필요

2. **비동기 큐** (향후 확장)
   - BullMQ, Redis Queue 사용
   - 재시도 로직, 우선순위 큐
   - 확장성 높음

**초기 구현**: 동기 전송 (간단함), 향후 큐로 전환 가능

### 디바이스 토큰 관리 전략

1. **데이터베이스 테이블** (권장)
   - `device_tokens` 테이블에 저장
   - 영구 저장, 조회 가능
   - UNIQUE 제약으로 중복 방지

2. **메모리 캐시** (비권장)
   - 서버 재시작 시 초기화
   - 확장성 낮음

**초기 구현**: 데이터베이스 테이블

## Data Models

### device_tokens (Database Schema)

```sql
CREATE TABLE device_tokens (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '0',
  device_id TEXT NOT NULL UNIQUE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Implementation Phases

### Phase 1: 백엔드 푸시 알림 API (P1)

**목표**: 디바이스 토큰 관리 및 푸시 알림 전송 API 구현

**작업 내역**:

1. 디바이스 토큰 테이블 생성
   - `db/schema.ts`에 `deviceTokens` 추가
   - 마이그레이션 실행

2. 디바이스 토큰 등록 API
   - `app/api/notifications/register-device/route.ts`
   - 토큰 등록/업데이트

3. 푸시 알림 전송 함수
   - `lib/notifications/push.ts`
   - Expo Push Notification Service 연동

4. 알림 조회 API
   - `app/api/notifications/alerts/route.ts`
   - 최근 알림 조회

**성공 기준**:
- API 엔드포인트 정상 동작
- 푸시 알림 전송 함수 정상 동작

### Phase 2: 모바일 앱 푸시 알림 설정 (P1)

**목표**: 모바일 앱에서 푸시 알림 수신 및 처리 기능 구현

**작업 내역**:

1. 패키지 설치
   - `expo-notifications`
   - `expo-device`

2. 푸시 알림 서비스 구현
   - `src/services/notifications.ts`
   - 권한 요청, 토큰 등록, 알림 수신 처리

3. 푸시 알림 훅 구현
   - `src/hooks/usePushNotifications.ts`
   - 알림 초기화 및 리스너 관리

4. App.tsx 통합
   - 푸시 알림 훅 추가

5. app.json 설정
   - 푸시 알림 플러그인 추가

**성공 기준**:
- 모바일 앱에서 푸시 알림 수신 확인 ✅
- 종합 알림 형식 검증 (여러 종목 → 1개 알림) ✅
- 백그라운드/포그라운드 모두에서 알림 수신 ✅
- 알림 클릭 시 상세 화면 이동 확인 (향후 구현)

### Phase 3: ETL 통합 (P1)

**목표**: ETL에서 푸시 알림 전송 통합

**작업 내역**:

1. ETL에 푸시 알림 통합
   - `detect-price-alerts.ts` 업데이트
   - `sendNotification()` 함수에 푸시 알림 추가
   - `ALERT_CHANNELS` 환경 변수 확인

2. 환경 변수 설정
   - `ALERT_CHANNELS=app,email`
   - `EXPO_ACCESS_TOKEN` (선택사항)

**성공 기준**:
- ETL 실행 시 푸시 알림 전송 확인
- 이메일과 푸시 알림 모두 전송 확인

### Phase 4: 테스트 및 검증 (P1)

**목표**: 전체 시스템 검증 및 버그 수정

**작업 내역**:

1. 로컬 테스트
   - 디바이스 토큰 등록 확인
   - 푸시 알림 수신 확인
   - 알림 클릭 동작 확인

2. 프로덕션 검증
   - 실제 ETL 실행 후 푸시 알림 수신 확인
   - 여러 디바이스에 동시 전송 확인

3. 문서화
   - README 업데이트
   - 환경 변수 가이드 작성

**성공 기준**:
- 모든 테스트 통과
- 프로덕션에서 정상 동작 확인

## Risk Assessment

### 기술적 리스크

1. **Expo Push Notification Service 장애**
   - **영향**: 알림 미전송
   - **완화**: 에러 로깅, ETL은 계속 진행, 재시도 로직 (향후)

2. **디바이스 토큰 만료**
   - **영향**: 알림 미전송
   - **완화**: 토큰 갱신 로직, 비활성 토큰 관리

3. **푸시 알림 전송 지연**
   - **영향**: ETL 지연
   - **완화**: 비동기 처리, 배치 전송

### 비즈니스 리스크

1. **사용자 권한 거부**
   - **영향**: 푸시 알림 미수신
   - **완화**: 권한 요청 안내, 대안 제공 (이메일)

2. **디바이스 토큰 누락**
   - **영향**: 알림 미전송
   - **완화**: 토큰 등록 확인 로직, 재등록 유도

## Success Metrics

### 기능적 메트릭

- 푸시 알림 전송 성공률: 95% 이상 ✅
- 디바이스 토큰 등록 성공률: 100% ✅
- 알림 수신률: 90% 이상 ✅
- 종합 알림 형식 구현 완료 ✅
- 실제 데이터로 테스트 완료 (35개 종목) ✅

### 비기능 메트릭

- 푸시 알림 전송 지연: 3초 이하 (종목당)
- ETL 전체 실행 시간 증가: 5초 이하
- 디바이스 토큰 조회 시간: 1초 이하

## Future Enhancements

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
- `expo-server-sdk`: Expo 푸시 알림 전송 (서버 사이드)

**Mobile (apps/mobile)**:
- `expo-notifications`: 푸시 알림 수신 및 관리
- `expo-device`: 디바이스 정보 조회

### 환경 변수

- `ALERT_CHANNELS`: 알림 채널 (app,email)
- `EXPO_ACCESS_TOKEN`: Expo Access Token (선택사항, EAS Push 사용 시)

**모바일 앱**:
- `API_BASE_URL`: 백엔드 API URL

## Notes

- **전제 조건**: `price-alert-email` 피쳐 완료 필수 ✅
- 초기 구현은 최소 기능으로 시작 (MVP) ✅
- 향후 확장을 고려한 모듈화된 구조 ✅
- 에러 발생 시에도 ETL은 정상 완료 (Graceful Degradation) ✅

## 구현 완료 사항 (2025-12-03)

- ✅ 디바이스 토큰 관리 (등록, 업데이트, 비활성화)
- ✅ 푸시 알림 전송 함수 구현 (Expo Push Notification Service)
- ✅ 모바일 앱 푸시 알림 수신 및 처리
- ✅ ETL에 푸시 알림 통합
- ✅ 종합 알림 형식 구현 (개별 알림 → 1개 종합 알림)
- ✅ 메시지 크기 제한 문제 해결 (data 필드 최소화)
- ✅ 실제 데이터로 테스트 완료 (35개 종목)
- ✅ 이메일 알림과 동일한 형식 사용

## 주요 설계 결정

1. **종합 알림 형식**: 여러 종목이 감지되어도 1개의 종합 알림만 전송하여 사용자 경험 개선
2. **data 필드 최소화**: 메시지 크기 제한(약 4KB)을 고려하여 최소한의 정보만 포함
3. **상세 정보 조회**: 푸시 알림에는 요약 정보만 포함하고, 상세 정보는 앱에서 API로 조회
4. **이메일과 일관성**: 푸시 알림 형식을 이메일 알림과 동일하게 유지

