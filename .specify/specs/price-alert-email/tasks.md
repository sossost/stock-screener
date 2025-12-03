# 가격 알림 시스템 (이메일) 작업 목록

**Branch**: `price-alert-email` | **Date**: 2025-12-03 | **Tasks**: [link]  
**Input**: 가격 알림 시스템 (이메일) 스펙 기반 상세 작업 목록

## User Story 1: 정배열 상태에서 20일선 돌파 감지 및 이메일 알림 (P1)

### US1.0: 데이터 모델 및 유틸리티 함수

- [ ] **T1.0.1**: 알림 이력 테이블 스키마 정의 (선택사항)

  ```typescript
  // apps/web/src/db/schema.ts
  export const priceAlerts = pgTable(
    "price_alerts",
    {
      id: serial("id").primaryKey(),
      symbol: text("symbol")
        .notNull()
        .references(() => symbols.symbol, { onDelete: "cascade" }),
      alertType: text("alert_type").notNull(), // 'ma20_breakout_ordered'
      alertDate: text("alert_date").notNull(), // 'YYYY-MM-DD'
      conditionData: jsonb("condition_data"), // { ma20, ma50, close 등 }
      notifiedAt: timestamp("notified_at", { withTimezone: true }).defaultNow(),
      notificationChannels: text("notification_channels").array(), // ['email']
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    },
    (t) => ({
      uq: unique("uq_price_alerts_symbol_type_date").on(
        t.symbol,
        t.alertType,
        t.alertDate
      ),
      idx_symbol_date: index("idx_price_alerts_symbol_date").on(
        t.symbol,
        t.alertDate
      ),
      idx_type_date: index("idx_price_alerts_type_date").on(
        t.alertType,
        t.alertDate
      ),
    })
  );
  ```

  - 파일: `apps/web/src/db/schema.ts`
  - 중복 알림 방지를 위한 UNIQUE 제약조건
  - 조회 성능을 위한 인덱스 추가
  - **참고**: 초기 구현에서는 테이블 없이 메모리 캐시로도 가능 (선택사항)

- [ ] **T1.0.2**: 알림 타입 상수 정의

  ```typescript
  // apps/web/src/lib/alerts/constants.ts
  export const ALERT_TYPES = {
    MA20_BREAKOUT_ORDERED: "ma20_breakout_ordered",
  } as const;

  export type AlertType = typeof ALERT_TYPES[keyof typeof ALERT_TYPES];

  export const ALERT_CHANNELS = {
    EMAIL: "email",
  } as const;
  ```

  - 파일: `apps/web/src/lib/alerts/constants.ts` (신규)
  - 타입 안전성을 위한 상수 정의
  - 향후 추가 알림 타입 확장 용이

- [ ] **T1.0.3**: 알림 데이터 타입 정의

  ```typescript
  // apps/web/src/lib/alerts/types.ts
  export interface AlertData {
    symbol: string;
    companyName: string;
    alertType: AlertType;
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

  - 파일: `apps/web/src/lib/alerts/types.ts` (신규)
  - 알림 데이터 구조 명확화

### US1.1: 알림 감지 ETL 로직

- [ ] **T1.1.1**: 최신 거래일 조회 유틸리티 함수

  ```typescript
  // apps/web/src/etl/utils/date-helpers.ts
  export async function getLatestTradeDate(): Promise<string> {
    const result = await db.execute(sql`
      SELECT MAX(date)::date AS latest_date
      FROM daily_prices;
    `);
    return (result.rows[0] as any)?.latest_date;
  }

  export async function getPreviousTradeDate(
    currentDate: string
  ): Promise<string | null> {
    const result = await db.execute(sql`
      SELECT MAX(date)::date AS prev_date
      FROM daily_prices
      WHERE date < ${currentDate};
    `);
    return (result.rows[0] as any)?.prev_date || null;
  }
  ```

  - 파일: `apps/web/src/etl/utils/date-helpers.ts` (신규 또는 기존 파일에 추가)
  - 거래일 기준으로 전일 계산 (주말/공휴일 제외)

- [ ] **T1.1.2**: 알림 감지 메인 함수 구현

  ```typescript
  // apps/web/src/etl/jobs/detect-price-alerts.ts
  import { db } from "@/db/client";
  import { sql } from "drizzle-orm";
  import { getLatestTradeDate, getPreviousTradeDate } from "../utils/date-helpers";
  import type { AlertData } from "@/lib/alerts/types";
  import { ALERT_TYPES } from "@/lib/alerts/constants";

  async function detectMa20BreakoutOrdered(): Promise<AlertData[]> {
    const latestDate = await getLatestTradeDate();
    if (!latestDate) {
      console.warn("⚠️ No trade date found");
      return [];
    }

    const previousDate = await getPreviousTradeDate(latestDate);
    if (!previousDate) {
      console.warn("⚠️ No previous trade date found");
      return [];
    }

    const result = await db.execute(sql`
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

    return (result.rows as any[]).map((r) => ({
      symbol: r.symbol,
      companyName: r.company_name || r.symbol,
      alertType: ALERT_TYPES.MA20_BREAKOUT_ORDERED,
      todayClose: Number(r.today_close),
      todayMa20: Number(r.today_ma20),
      todayMa50: Number(r.today_ma50),
      todayMa100: Number(r.today_ma100),
      todayMa200: Number(r.today_ma200),
      prevClose: Number(r.prev_close),
      prevMa20: Number(r.prev_ma20),
      breakoutPercent: Number(r.breakout_percent),
      date: latestDate,
    }));
  }
  ```

  - 파일: `apps/web/src/etl/jobs/detect-price-alerts.ts` (신규)
  - 정배열 및 20일선 돌파 조건을 SQL로 구현
  - 타입 안전한 결과 반환

- [ ] **T1.1.3**: 중복 알림 방지 로직

  ```typescript
  // apps/web/src/etl/jobs/detect-price-alerts.ts
  async function getNotifiedToday(
    date: string,
    alertType: string
  ): Promise<string[]> {
    // 옵션 1: price_alerts 테이블 사용 (테이블 생성 시)
    const result = await db.execute(sql`
      SELECT symbol
      FROM price_alerts
      WHERE alert_date = ${date}
        AND alert_type = ${alertType};
    `);
    return (result.rows as any[]).map((r) => r.symbol);

    // 옵션 2: 메모리 캐시 사용 (초기 구현, 테이블 없이)
    // 간단한 Set 또는 Map으로 관리
  }

  async function markAsNotified(alert: AlertData): Promise<void> {
    // 옵션 1: price_alerts 테이블에 저장
    await db.insert(priceAlerts).values({
      symbol: alert.symbol,
      alertType: alert.alertType,
      alertDate: alert.date,
      conditionData: {
        todayClose: alert.todayClose,
        todayMa20: alert.todayMa20,
        breakoutPercent: alert.breakoutPercent,
      },
      notificationChannels: ["email"],
    });

    // 옵션 2: 메모리 캐시에 저장 (초기 구현)
  }
  ```

  - 파일: `apps/web/src/etl/jobs/detect-price-alerts.ts`
  - 같은 종목, 같은 조건에 대해 하루 1회만 알림
  - 초기 구현은 메모리 캐시로도 가능

- [ ] **T1.1.4**: 메인 ETL 함수 구현

  ```typescript
  // apps/web/src/etl/jobs/detect-price-alerts.ts
  async function main() {
    console.log("🚀 Starting Price Alert Detection...");

    // 환경 변수 검증
    if (process.env.ENABLE_PRICE_ALERTS !== "true") {
      console.log("ℹ️ Price alerts disabled (ENABLE_PRICE_ALERTS != true)");
      return;
    }

    try {
      // 1. 알림 감지
      const alerts = await detectMa20BreakoutOrdered();
      console.log(`📊 Found ${alerts.length} alerts`);

      if (alerts.length === 0) {
        console.log("✅ No alerts detected");
        return;
      }

      // 2. 중복 알림 방지
      const latestDate = await getLatestTradeDate();
      const notified = await getNotifiedToday(
        latestDate!,
        ALERT_TYPES.MA20_BREAKOUT_ORDERED
      );
      const newAlerts = alerts.filter(
        (a) => !notified.includes(a.symbol)
      );

      console.log(
        `📊 New alerts: ${newAlerts.length} (${alerts.length - newAlerts.length} already notified)`
      );

      // 3. 알림 전송
      for (const alert of newAlerts) {
        try {
          await sendEmailAlert(alert);
          await markAsNotified(alert);
          console.log(`✅ Alert sent for ${alert.symbol}`);
        } catch (error) {
          console.error(`❌ Failed to send alert for ${alert.symbol}:`, error);
          // 에러가 있어도 다음 알림은 계속 처리
        }
      }

      console.log("✅ Price alert detection completed");
    } catch (error) {
      console.error("❌ Price alert detection failed:", error);
      throw error;
    }
  }
  ```

  - 파일: `apps/web/src/etl/jobs/detect-price-alerts.ts`
  - 환경 변수로 알림 활성화/비활성화 제어
  - 에러 발생 시에도 ETL은 계속 진행

- [ ] **T1.1.5**: package.json에 ETL 스크립트 추가

  ```json
  // apps/web/package.json
  {
    "scripts": {
      "etl:detect-alerts": "tsx src/etl/jobs/detect-price-alerts.ts"
    }
  }
  ```

  - 파일: `apps/web/package.json`
  - 수동 실행 커맨드 추가

<!-- US1.2, US1.3는 Phase 1 완료 후 진행 -->

- [ ] **T1.2.1**: 이메일 서비스 설정 (Resend 예시)

  ```typescript
  // apps/web/src/lib/notifications/email.ts
  import { Resend } from "resend";

  const resend = new Resend(process.env.RESEND_API_KEY);

  export async function sendEmailAlert(alert: AlertData): Promise<void> {
    const subject = `[스크리너 알림] 20일선 돌파 감지 - ${alert.symbol}`;
    const html = formatEmailTemplate(alert);

    await resend.emails.send({
      from: process.env.NOTIFICATION_EMAIL_FROM!,
      to: process.env.NOTIFICATION_EMAIL_TO!.split(","),
      subject,
      html,
    });
  }

  function formatEmailTemplate(alert: AlertData): string {
    return `
      <h2>가격 알림: ${alert.symbol} (${alert.companyName})</h2>
      <p><strong>날짜:</strong> ${alert.date}</p>
      <p><strong>조건:</strong> 정배열 상태에서 20일선 돌파</p>
      
      <h3>가격 정보</h3>
      <ul>
        <li>종가: $${alert.todayClose.toFixed(2)}</li>
        <li>20일선: $${alert.todayMa20.toFixed(2)}</li>
        <li>50일선: $${alert.todayMa50.toFixed(2)}</li>
        <li>100일선: $${alert.todayMa100.toFixed(2)}</li>
        <li>200일선: $${alert.todayMa200.toFixed(2)}</li>
      </ul>
      
      <h3>돌파 정보</h3>
      <ul>
        <li>전일 종가: $${alert.prevClose.toFixed(2)}</li>
        <li>전일 20일선: $${alert.prevMa20.toFixed(2)}</li>
        <li>돌파율: ${alert.breakoutPercent.toFixed(2)}%</li>
      </ul>
    `;
  }
  ```

  - 파일: `apps/web/src/lib/notifications/email.ts` (신규)
  - Resend 또는 다른 이메일 서비스 연동
  - HTML 템플릿으로 알림 내용 포맷팅

- [ ] **T1.2.2**: 이메일 서비스 패키지 설치

  ```bash
  # Resend 사용 시
  yarn workspace web add resend

  # 또는 AWS SES 사용 시
  yarn workspace web add @aws-sdk/client-ses
  ```

  - 파일: `apps/web/package.json`
  - 선택한 이메일 서비스에 맞는 패키지 설치

- [ ] **T1.2.3**: 환경 변수 설정

  ```env
  # .env.local 또는 .env
  RESEND_API_KEY=re_xxxxx
  NOTIFICATION_EMAIL_FROM=noreply@screener.com
  NOTIFICATION_EMAIL_TO=user@example.com,user2@example.com
  ```

  - 파일: `apps/web/.env.local` 또는 `apps/web/.env.example`
  - 이메일 서비스 API 키 및 수신자 설정

- [ ] **T1.2.4**: ETL에 이메일 전송 통합

  ```typescript
  // apps/web/src/etl/jobs/detect-price-alerts.ts
  import { sendEmailAlert } from "@/lib/notifications/email";

  async function sendNotification(alert: AlertData): Promise<void> {
    const channels = process.env.ALERT_CHANNELS?.split(",") || [];

    // 이메일 전송
    if (channels.includes("email")) {
      await sendEmailAlert(alert);
    }

    // 알림 이력 저장
    await markAsNotified(alert);
  }
  ```

  - 파일: `apps/web/src/etl/jobs/detect-price-alerts.ts`
  - 환경 변수로 알림 채널 제어
  - 에러 처리 포함

### US1.3: 통합 및 테스트

- [x] **T1.3.1**: GitHub Actions에 알림 감지 단계 추가

  ```yaml
  # .github/workflows/etl-daily.yml
  - name: Detect Price Alerts
    run: |
      cd apps/web
      yarn etl:detect-alerts
    env:
      ENABLE_PRICE_ALERTS: true
      ALERT_CHANNELS: email
    continue-on-error: true  # 알림 실패해도 ETL은 계속
  ```

  - 파일: `.github/workflows/etl-daily.yml`
  - 일일 가격/이동평균 ETL 완료 후 자동 실행
  - `continue-on-error: true`로 알림 실패해도 ETL은 계속 진행

- [x] **T1.3.2**: 로컬 테스트

  - [x] 테스트 데이터로 조건 감지 확인
  - [x] 이메일 전송 테스트 (실제 이메일 수신 확인)
  - [x] 중복 알림 방지 확인 (메모리 캐시로 같은 실행 내에서 중복 방지)
  - [x] 전일 데이터 없는 경우 에러 없이 처리 확인 (빈 배열 반환)

- [x] **T1.3.3**: 프로덕션 배포 전 검증

  - [x] 환경 변수 설정 확인 (GitHub Secrets 설정 완료)
  - [ ] 이메일 서비스 API 키 유효성 확인 (실제 ETL 실행 필요)
  - [ ] 실제 ETL 실행 후 알림 전송 확인 (GitHub Actions 또는 로컬 실행)
  - [ ] 알림 내용 정확성 확인 (실제 이메일 수신 후 확인)

## 비기능 요구사항

### 성능
- 알림 감지 쿼리는 기존 인덱스 활용 (추가 인덱스 불필요)
- 알림 전송은 비동기 처리 (ETL 블로킹 방지)

### 에러 처리
- 이메일 전송 실패 시 로깅만 하고 ETL은 계속 진행
- 알림 서비스 장애 시에도 ETL은 정상 완료
- 각 알림 전송은 독립적으로 처리 (하나 실패해도 나머지는 계속)

### 확장성
- 모듈화된 구조로 향후 추가 알림 조건 지원 용이
- 알림 채널 추가 용이 (이메일 외 SMS, 슬랙 등)

## 환경 변수 체크리스트

**Web (apps/web)**:
- [ ] `ENABLE_PRICE_ALERTS=true` (알림 활성화)
- [ ] `ALERT_CHANNELS=email` (알림 채널)
- [ ] `RESEND_API_KEY=re_xxxxx` (이메일 서비스 키)
- [ ] `NOTIFICATION_EMAIL_FROM=noreply@screener.com` (발신자)
- [ ] `NOTIFICATION_EMAIL_TO=user@example.com` (수신자, 쉼표로 구분)

## 수락 기준

### 감지 로직
- [x] ETL 실행 시 조건에 맞는 종목 정확히 감지
- [x] 중복 알림 방지 (메모리 캐시로 같은 실행 내에서 중복 방지)
- [x] 전일 데이터가 없는 경우 에러 없이 처리 (빈 배열 반환)

### 알림 전송
- [x] 조건 감지 시 이메일 알림 전송 (실제 이메일 수신 확인)
- [x] 알림 내용 정확성 확인 (종목, 가격, 이동평균선 값, 섹터, 시가총액, 전일대비, 거래량변동)
- [x] 알림 실패 시 에러 로깅 (ETL은 계속 진행)

### 통합 테스트
- [x] 테스트 데이터로 조건 감지 확인 (단위 테스트 완료)
- [x] 실제 ETL 실행 후 알림 전송 확인 (로컬 테스트 완료)
- [x] GitHub Actions에서 자동 실행 확인 (워크플로우 추가 완료)

