# 가격 알림 시스템 스펙

## 목표
- ETL 업데이트 시 특정 기술적 조건에 맞는 종목을 감지하고, 앱과 이메일로 알림을 전송한다.
- 첫 번째 조건: 정배열 상태에서 20일선 돌파 감지

## 정의·범위

### 알림 조건 1: 정배열 상태에서 20일선 돌파
**조건 정의**:
1. **정배열 상태**: `ma20 > ma50 > ma100 > ma200` (모든 조건 만족)
2. **20일선 돌파**: 
   - 전일 종가 < ma20 (전일 기준)
   - 오늘 종가 > ma20 (오늘 기준)
   - 즉, 종가가 20일선을 아래에서 위로 돌파한 경우

**데이터 소스**:
- `daily_prices`: `symbol`, `date`, `adj_close` (종가)
- `daily_ma`: `symbol`, `date`, `ma20`, `ma50`, `ma100`, `ma200`

**감지 시점**:
- 일일 가격 ETL (`yarn etl:daily-prices`) 완료 후
- 일일 이동평균 ETL (`yarn etl:daily-ma`) 완료 후
- 두 ETL이 모두 완료된 후 알림 감지 로직 실행

**범위**:
- 알림 감지 로직 (ETL)
- 알림 전송 (앱 푸시 + 이메일)
- 알림 이력 저장 (선택사항, 향후 확장)
- 중복 알림 방지 (같은 종목, 같은 조건에 대해 하루 1회만 알림)

## 데이터 모델 / 마이그레이션

### 알림 이력 테이블 (선택사항, 향후 확장용)
```sql
CREATE TABLE price_alerts (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL REFERENCES symbols(symbol),
  alert_type TEXT NOT NULL, -- 'ma20_breakout_ordered'
  alert_date DATE NOT NULL, -- 알림 발생일
  condition_data JSONB, -- 조건 상세 데이터 (ma20, ma50, close 등)
  notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notification_channels TEXT[], -- ['app', 'email']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, alert_type, alert_date) -- 중복 방지
);

CREATE INDEX idx_price_alerts_symbol_date ON price_alerts(symbol, alert_date DESC);
CREATE INDEX idx_price_alerts_type_date ON price_alerts(alert_type, alert_date DESC);
```

**초기 구현**: 테이블 생성은 선택사항. 향후 알림 이력 조회 기능 추가 시 구현.

## ETL / 알림 감지 로직

### 감지 로직 위치
- 파일: `apps/web/src/etl/jobs/detect-price-alerts.ts`
- 실행: 일일 가격/이동평균 ETL 완료 후 수동 또는 자동 실행
- 커맨드: `yarn etl:detect-alerts` 또는 GitHub Actions에서 자동 실행

### 감지 알고리즘
```typescript
// 1. 최신 거래일 조회
const latestDate = await getLatestTradeDate();

// 2. 전일 날짜 계산
const previousDate = await getPreviousTradeDate(latestDate);

// 3. 조건에 맞는 종목 조회
const candidates = await db.execute(sql`
  WITH latest AS (
    SELECT 
      dp.symbol,
      dp.adj_close::numeric AS today_close,
      dm.ma20::numeric AS today_ma20,
      dm.ma50::numeric AS today_ma50,
      dm.ma100::numeric AS today_ma100,
      dm.ma200::numeric AS today_ma200
    FROM daily_prices dp
    JOIN daily_ma dm ON dp.symbol = dm.symbol AND dp.date = dm.date
    WHERE dp.date = ${latestDate}
      AND dp.adj_close IS NOT NULL
      AND dm.ma20 IS NOT NULL
      AND dm.ma50 IS NOT NULL
      AND dm.ma100 IS NOT NULL
      AND dm.ma200 IS NOT NULL
  ),
  previous AS (
    SELECT 
      dp.symbol,
      dp.adj_close::numeric AS prev_close,
      dm.ma20::numeric AS prev_ma20
    FROM daily_prices dp
    JOIN daily_ma dm ON dp.symbol = dm.symbol AND dp.date = dm.date
    WHERE dp.date = ${previousDate}
      AND dp.adj_close IS NOT NULL
      AND dm.ma20 IS NOT NULL
  ),
  ordered AS (
    SELECT 
      l.symbol,
      l.today_close,
      l.today_ma20,
      l.today_ma50,
      l.today_ma100,
      l.today_ma200,
      p.prev_close,
      p.prev_ma20
    FROM latest l
    JOIN previous p ON l.symbol = p.symbol
    WHERE 
      -- 정배열 조건
      l.today_ma20 > l.today_ma50
      AND l.today_ma50 > l.today_ma100
      AND l.today_ma100 > l.today_ma200
      -- 20일선 돌파 조건
      AND p.prev_close < p.prev_ma20  -- 전일 종가 < 전일 ma20
      AND l.today_close > l.today_ma20  -- 오늘 종가 > 오늘 ma20
  )
  SELECT 
    o.symbol,
    s.company_name,
    o.today_close,
    o.today_ma20,
    o.today_ma50,
    o.today_ma100,
    o.today_ma200,
    o.prev_close,
    o.prev_ma20,
    (o.today_close / o.prev_ma20 - 1) * 100 AS breakout_percent
  FROM ordered o
  JOIN symbols s ON o.symbol = s.symbol
  ORDER BY o.symbol;
`);

// 4. 중복 알림 방지 (이미 오늘 알림을 보낸 종목 제외)
const notifiedToday = await getNotifiedToday(latestDate, 'ma20_breakout_ordered');
const newAlerts = candidates.filter(c => !notifiedToday.includes(c.symbol));

// 5. 알림 전송
for (const alert of newAlerts) {
  await sendNotification(alert);
}
```

### 중복 알림 방지
- 같은 종목, 같은 조건에 대해 하루 1회만 알림
- `price_alerts` 테이블에 기록하여 중복 체크
- 또는 간단하게 `localStorage` 또는 메모리 캐시 사용 (초기 구현)

## 알림 전송

### 알림 채널

#### 1. 앱 푸시 알림 (모바일 앱)
- **구현 방식**: 
  - Expo Push Notification Service (EAS) 사용
  - 모바일 앱에서 푸시 토큰 등록
  - ETL에서 알림 감지 시 푸시 알림 전송
  - 백그라운드/포그라운드 모두에서 알림 수신
- **알림 내용**:
  ```
  제목: [20일선 돌파] AAPL
  본문: 정배열 상태에서 20일선 돌파 감지
       종가: $150.25 | 20일선: $148.50
  ```
- **우선순위**: P1 (즉시 구현)
- **기술 스택**: 
  - `expo-notifications` (모바일 앱)
  - `expo-server-sdk` (백엔드)
  - Expo Push Notification Service

#### 2. 이메일 알림
- **구현 방식**:
  - 이메일 서비스 연동 (SendGrid, AWS SES, Resend 등)
  - 또는 SMTP 직접 사용
- **알림 내용**:
  - 제목: `[스크리너 알림] 20일선 돌파 감지 - AAPL`
  - 본문: 종목 정보, 가격, 이동평균선 정보, 돌파율 등
- **우선순위**: P1 (즉시 구현)

### 알림 템플릿
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
  date: string;
}

function formatAlertMessage(alert: AlertData): string {
  return `
종목: ${alert.symbol} (${alert.companyName})
날짜: ${alert.date}
조건: 정배열 상태에서 20일선 돌파

가격 정보:
- 종가: $${alert.todayClose.toFixed(2)}
- 20일선: $${alert.todayMa20.toFixed(2)}
- 50일선: $${alert.todayMa50.toFixed(2)}
- 100일선: $${alert.todayMa100.toFixed(2)}
- 200일선: $${alert.todayMa200.toFixed(2)}

돌파 정보:
- 전일 종가: $${alert.prevClose.toFixed(2)}
- 전일 20일선: $${alert.prevMa20.toFixed(2)}
- 돌파율: ${alert.breakoutPercent.toFixed(2)}%
  `.trim();
}
```

## API / UI

### 알림 수신 API

#### 1. 알림 조회 API
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

#### 2. 디바이스 토큰 등록 API
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

### 모바일 앱 구현

#### 푸시 알림 설정
- `expo-notifications` 패키지 설치
- 푸시 알림 권한 요청
- 푸시 토큰 등록 (앱 시작 시)
- 알림 수신 핸들러 구현
- 알림 클릭 시 상세 화면 이동

#### 알림 목록 화면 (선택사항)
- 알림 이력 조회
- 알림 읽음/삭제 기능
- 알림 상세 정보 표시

## 환경 변수

```env
# 이메일 서비스 (예: Resend)
RESEND_API_KEY=re_xxxxx
NOTIFICATION_EMAIL_FROM=noreply@screener.com
NOTIFICATION_EMAIL_TO=user@example.com

# 푸시 알림 (Expo)
EXPO_ACCESS_TOKEN=xxxxx (선택사항, EAS Push 사용 시)

# 알림 설정
ENABLE_PRICE_ALERTS=true
ALERT_CHANNELS=app,email
```

## 예시 / 수락 기준

### 감지 로직
- [ ] ETL 실행 시 조건에 맞는 종목 감지
- [ ] 중복 알림 방지 (같은 종목, 같은 날 1회만)
- [ ] 전일 데이터가 없는 경우 정상 처리 (에러 없음)

### 알림 전송
- [ ] 조건 감지 시 앱 알림 전송 (API 호출 성공)
- [ ] 조건 감지 시 이메일 알림 전송 (이메일 수신 확인)
- [ ] 알림 실패 시 에러 로깅 (재시도 로직은 향후 추가)

### 통합 테스트
- [ ] 테스트 데이터로 조건 감지 확인
- [ ] 실제 ETL 실행 후 알림 전송 확인
- [ ] 중복 알림 방지 확인

## 비기능 / 제약

### 성능
- 알림 감지 쿼리는 인덱스 활용으로 빠르게 실행 (기존 인덱스 사용)
- 알림 전송은 비동기 처리 (블로킹 방지)

### 에러 처리
- 이메일 전송 실패 시 로깅만 하고 ETL은 계속 진행
- 알림 서비스 장애 시에도 ETL은 정상 완료

### 확장성
- 향후 추가 알림 조건 지원 (모듈화된 구조)
- 알림 채널 추가 용이 (앱, 이메일 외 SMS, 슬랙 등)

## 향후 확장

### 추가 알림 조건
- 골든크로스 감지
- 거래량 급증 감지
- RSI 과매수/과매도 구간 진입
- 지지선/저항선 돌파

### 알림 설정 (향후 확장)
- 사용자별 알림 조건 커스터마이징
- 알림 채널 선택 (초기: 앱/이메일, 향후: SMS, 슬랙, 텔레그램 등)
- 알림 빈도 설정 (즉시/일일 요약/주간 요약)

### 알림 채널 확장 (향후 구현)
- SMS 알림 (Twilio 등)
- 슬랙 알림 (Slack Webhook)
- 텔레그램 알림 (Telegram Bot)
- 기타 메시징 서비스

**초기 구현 범위**: 앱 서비스 + 이메일만 지원

### 알림 이력
- 알림 이력 조회 UI
- 알림 통계 (조건별 발생 빈도)
- 알림 효과 분석 (돌파 후 수익률 추적)

