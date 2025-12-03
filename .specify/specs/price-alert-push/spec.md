# 가격 알림 시스템 (푸시 알림) 스펙

## 목표
- 이미 구현된 이메일 알림 시스템에 모바일 앱 푸시 알림 기능을 추가한다.
- 정배열 상태에서 20일선 돌파 감지 시 모바일 앱으로 푸시 알림을 전송한다.

## 전제 조건
- ✅ `price-alert-email` 피쳐 완료 (2025-12-03)
- ✅ 알림 감지 로직 (`detect-price-alerts.ts`) 구현 완료
- ✅ 이메일 알림 정상 작동 중 (GitHub Actions에서 검증 완료)
- ✅ 타임아웃 및 재시도 로직 적용 완료 (ADR-013)

## 정의·범위

### 알림 조건
- 기존 알림 조건과 동일: 정배열 상태에서 20일선 돌파 감지
- 이메일 알림과 동일한 조건으로 푸시 알림 전송

### 범위
- 디바이스 토큰 관리 (등록, 업데이트, 비활성화)
- 푸시 알림 전송 (Expo Push Notification Service)
- 모바일 앱 푸시 알림 수신 및 처리
- 알림 클릭 시 상세 화면 이동
- ETL에 푸시 알림 통합

## 데이터 모델 / 마이그레이션

### 디바이스 토큰 테이블
```sql
CREATE TABLE device_tokens (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '0', -- 향후 사용자별 관리
  device_id TEXT NOT NULL UNIQUE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'ios' | 'android'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active);
```

### price_alerts 테이블 업데이트
- 기존 `price_alerts` 테이블의 `notification_channels`에 `'app'` 추가
- 이미 `price-alert-email` 피쳐에서 생성되었다면 스키마 변경 불필요

## 백엔드 구현

### API 엔드포인트

#### 1. 디바이스 토큰 등록 API
- **엔드포인트**: `POST /api/notifications/register-device`
- **요청 형식**:
```json
{
  "pushToken": "ExponentPushToken[xxxxx]",
  "deviceId": "unique-device-id",
  "platform": "ios" | "android"
}
```
- **응답**: `{ "success": true }`
- **기능**: 디바이스 토큰 등록/업데이트, 중복 등록 방지

#### 2. 알림 조회 API
- **엔드포인트**: `GET /api/notifications/alerts`
- **응답 형식**:
```json
{
  "alerts": [
    {
      "id": 1,
      "symbol": "AAPL",
      "companyName": "Apple Inc.",
      "alertType": "ma20_breakout_ordered",
      "date": "2025-01-15",
      "message": "...",
      "notifiedAt": "2025-01-15T08:30:00Z"
    }
  ],
  "unreadCount": 1
}
```
- **기능**: 최근 7일간의 알림 조회 (향후 읽음/삭제 기능 추가 가능)

### 푸시 알림 전송 함수
- **파일**: `apps/web/src/lib/notifications/push.ts`
- **기능**:
  - 활성화된 모든 디바이스 토큰 조회
  - Expo Push Notification Service를 통한 배치 전송
  - 에러 처리 및 비활성 토큰 관리

### ETL 통합
- **파일**: `apps/web/src/etl/jobs/detect-price-alerts.ts`
- **변경 사항**:
  - `sendNotification()` 함수에 푸시 알림 전송 추가
  - `ALERT_CHANNELS` 환경 변수에 `'app'` 포함 시 푸시 알림 전송
  - `markAsNotified()` 함수에서 `notification_channels`에 `'app'` 추가

## 모바일 앱 구현

### 푸시 알림 설정
- **패키지**: `expo-notifications`, `expo-device`
- **기능**:
  - 푸시 알림 권한 요청
  - 푸시 토큰 생성 및 백엔드 등록
  - 포그라운드/백그라운드 알림 수신 처리
  - 알림 클릭 시 상세 화면 이동

### 알림 내용

**종합 알림 형식** (여러 종목이 감지되면 1개의 종합 알림으로 전송):

```text
제목: 가격 알림: 35개 종목 20일선 돌파 감지
본문: 조건: 정배열 상태에서 20일선 돌파
```

**설계 원칙**:
- 푸시 알림은 요약 정보만 제공 (상세 정보는 앱에서 확인)
- 여러 종목이 감지되어도 1개의 종합 알림만 전송 (사용자 경험 개선)
- 이메일 알림과 동일한 형식 사용

### 알림 데이터

```json
{
  "alertType": "ma20_breakout_ordered",
  "date": "2025-12-03",
  "alertCount": 35,
  "threadId": "price-alert-2025-12-03"
}
```

**주의사항**:
- `data` 필드에는 최소한의 정보만 포함 (메시지 크기 제한: 약 4KB)
- 상세 정보(종목 목록 등)는 앱에서 API로 조회 (`/api/alerts?date={date}`)
- 35개 종목의 전체 정보를 포함하면 크기 제한 초과로 전송 실패 가능

## 환경 변수

```env
# 푸시 알림 (Expo)
# 참고: Expo Push Notification Service는 기본 서비스로 별도 토큰 불필요
# 푸시 토큰은 DB의 device_tokens 테이블에서 관리됩니다
```

**모바일 앱**:
```env
API_BASE_URL=https://your-api.com  # 백엔드 API URL
```

## 예시 / 수락 기준

### 백엔드
- [x] 디바이스 토큰 등록 API 정상 동작 ✅
- [x] 푸시 알림 전송 함수 정상 동작 ✅
- [x] ETL에서 푸시 알림 전송 확인 ✅
- [x] 종합 알림 형식 구현 (개별 알림 → 1개 종합 알림) ✅
- [x] 메시지 크기 제한 문제 해결 (data 필드 최소화) ✅
- [ ] 알림 조회 API 정상 동작 (향후 구현)

### 모바일 앱
- [x] 푸시 알림 권한 요청 및 토큰 등록 ✅
- [x] 포그라운드에서 알림 수신 확인 ✅
- [x] 백그라운드에서 알림 수신 확인 ✅
- [x] 실제 데이터로 알림 수신 확인 ✅
- [ ] 알림 클릭 시 상세 화면 이동 확인 (향후 구현)

### 통합 테스트
- [x] 실제 데이터로 푸시 알림 수신 확인 (35개 종목) ✅
- [x] 알림 내용 정확성 확인 ✅
- [x] 종합 알림 형식 검증 완료 ✅
- [ ] 여러 디바이스에 동시 전송 확인 (향후 테스트)
- [ ] 실제 ETL 실행 후 푸시 알림 수신 확인 (프로덕션 배포 후)

## 비기능 / 제약

### 성능
- 푸시 알림 전송은 비동기 처리 (ETL 블로킹 방지)
- 배치 전송으로 효율성 향상 (Expo는 최대 100개씩)

### 에러 처리
- 푸시 알림 전송 실패 시 로깅만 하고 ETL은 계속 진행
- 유효하지 않은 토큰은 자동으로 비활성화
- 알림 서비스 장애 시에도 ETL은 정상 완료

### 확장성
- 향후 사용자별 알림 설정 지원 가능
- 다중 디바이스 지원 (같은 사용자의 여러 디바이스)

## 향후 확장

### 알림 설정
- 사용자별 알림 조건 커스터마이징
- 알림 빈도 설정 (즉시/일일 요약/주간 요약)
- 알림 이력 조회 UI

### 알림 분석
- 알림 효과 분석 (돌파 후 수익률 추적)
- 알림 통계 (조건별 발생 빈도)
- 백테스팅 (과거 데이터로 알림 효과 검증)

