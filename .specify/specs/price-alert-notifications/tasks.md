# 가격 알림 시스템 작업 목록

**Branch**: `price-alert-notifications` | **Date**: 2025-12-03 | **Tasks**: [link]  
**Input**: 가격 알림 시스템 스펙 기반 상세 작업 목록

## User Story 1: 정배열 상태에서 20일선 돌파 감지 (P1)

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
      notificationChannels: text("notification_channels").array(), // ['app', 'email']
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
    APP: "app",
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
      notificationChannels: ["app", "email"],
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
          await sendNotification(alert);
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

### US1.2: 이메일 알림 전송

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

### US1.3: 앱 푸시 알림 구현

- [ ] **T1.3.1**: 디바이스 토큰 테이블 생성

  ```typescript
  // apps/web/src/db/schema.ts
  export const deviceTokens = pgTable(
    "device_tokens",
    {
      id: serial("id").primaryKey(),
      userId: text("user_id").notNull().default("0"), // 향후 사용자별 관리
      deviceId: text("device_id").notNull(),
      pushToken: text("push_token").notNull(),
      platform: text("platform").notNull(), // 'ios' | 'android'
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
      updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    },
    (t) => ({
      uq: unique("uq_device_tokens_device_id").on(t.deviceId),
      idx_user: index("idx_device_tokens_user_id").on(t.userId),
      idx_active: index("idx_device_tokens_active").on(t.isActive),
    })
  );
  ```

  - 파일: `apps/web/src/db/schema.ts`
  - 디바이스별 푸시 토큰 관리
  - 활성/비활성 상태 관리

- [ ] **T1.3.2**: 디바이스 토큰 등록 API

  ```typescript
  // apps/web/src/app/api/notifications/register-device/route.ts
  import { NextResponse } from "next/server";
  import { db } from "@/db/client";
  import { deviceTokens } from "@/db/schema";
  import { eq } from "drizzle-orm";

  export async function POST(req: Request) {
    try {
      const { pushToken, deviceId, platform } = await req.json();

      // 기존 토큰 업데이트 또는 새로 생성
      await db
        .insert(deviceTokens)
        .values({
          deviceId,
          pushToken,
          platform,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: deviceTokens.deviceId,
          set: {
            pushToken,
            platform,
            isActive: true,
            updatedAt: new Date(),
          },
        });

      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to register device" },
        { status: 500 }
      );
    }
  }
  ```

  - 파일: `apps/web/src/app/api/notifications/register-device/route.ts` (신규)
  - 디바이스 토큰 등록/업데이트
  - 중복 등록 방지 (deviceId 기준)

- [ ] **T1.3.3**: 푸시 알림 전송 함수 구현

  ```typescript
  // apps/web/src/lib/notifications/push.ts
  import { Expo } from "expo-server-sdk";
  import { db } from "@/db/client";
  import { deviceTokens } from "@/db/schema";
  import { eq } from "drizzle-orm";
  import type { AlertData } from "@/lib/alerts/types";

  const expo = new Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN, // 선택사항
  });

  export async function sendPushNotification(
    alert: AlertData
  ): Promise<void> {
    // 활성화된 모든 디바이스 토큰 조회
    const tokens = await db
      .select()
      .from(deviceTokens)
      .where(eq(deviceTokens.isActive, true));

    if (tokens.length === 0) {
      console.log("⚠️ No active device tokens found");
      return;
    }

    const messages = tokens
      .map((token) => {
        // Expo Push Token 유효성 검사
        if (!Expo.isExpoPushToken(token.pushToken)) {
          console.warn(`⚠️ Invalid push token: ${token.pushToken}`);
          return null;
        }

        return {
          to: token.pushToken,
          sound: "default",
          title: `[20일선 돌파] ${alert.symbol}`,
          body: `정배열 상태에서 20일선 돌파 감지\n종가: $${alert.todayClose.toFixed(2)} | 20일선: $${alert.todayMa20.toFixed(2)}`,
          data: {
            symbol: alert.symbol,
            alertType: alert.alertType,
            date: alert.date,
          },
        };
      })
      .filter(Boolean) as any[];

    // 배치로 전송 (Expo는 최대 100개씩)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("❌ Failed to send push notifications:", error);
      }
    }

    // 에러 처리 (선택사항)
    // 티켓에서 에러 확인 및 비활성 토큰 처리
  }
  ```

  - 파일: `apps/web/src/lib/notifications/push.ts` (신규)
  - Expo Push Notification Service 사용
  - 배치 전송 지원
  - 에러 처리 포함

- [ ] **T1.3.4**: 알림 조회 API 엔드포인트

  ```typescript
  // apps/web/src/app/api/notifications/alerts/route.ts
  import { NextResponse } from "next/server";
  import { db } from "@/db/client";
  import { sql } from "drizzle-orm";

  export async function GET() {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          symbol,
          alert_type,
          alert_date,
          condition_data,
          notified_at
        FROM price_alerts
        WHERE alert_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY notified_at DESC
        LIMIT 50;
      `);

      return NextResponse.json({
        alerts: result.rows,
        unreadCount: result.rows.length, // 향후 읽음 처리 추가
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to fetch alerts" },
        { status: 500 }
      );
    }
  }
  ```

  - 파일: `apps/web/src/app/api/notifications/alerts/route.ts` (신규)
  - 최근 7일간의 알림 조회
  - 향후 읽음/삭제 기능 추가 가능

- [ ] **T1.3.5**: ETL에서 알림 전송 함수 구현

  ```typescript
  // apps/web/src/etl/jobs/detect-price-alerts.ts
  import { sendEmailAlert } from "@/lib/notifications/email";
  import { sendPushNotification } from "@/lib/notifications/push";

  async function sendNotification(alert: AlertData): Promise<void> {
    const channels = process.env.ALERT_CHANNELS?.split(",") || [];

    // 이메일 전송
    if (channels.includes("email")) {
      await sendEmailAlert(alert);
    }

    // 푸시 알림 전송
    if (channels.includes("app")) {
      await sendPushNotification(alert);
    }

    // 알림 이력 저장
    await markAsNotified(alert);
  }
  ```

  - 파일: `apps/web/src/etl/jobs/detect-price-alerts.ts`
  - 환경 변수로 알림 채널 제어
  - 이메일 및 푸시 알림 모두 지원
  - 에러 처리 포함

- [ ] **T1.3.6**: 모바일 앱 - expo-notifications 패키지 설치

  ```bash
  cd apps/mobile
  yarn add expo-notifications
  yarn add expo-device
  ```

  - 파일: `apps/mobile/package.json`
  - 푸시 알림 수신을 위한 필수 패키지

- [ ] **T1.3.7**: 모바일 앱 - 푸시 알림 서비스 구현

  ```typescript
  // apps/mobile/src/services/notifications.ts
  import * as Notifications from "expo-notifications";
  import * as Device from "expo-device";
  import { Platform } from "react-native";
  import Constants from "expo-constants";

  // 알림 핸들러 설정
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  export async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn("⚠️ Must use physical device for Push Notifications");
      return null;
    }

    // 권한 요청
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("⚠️ Failed to get push token for push notification!");
      return null;
    }

    // 푸시 토큰 가져오기
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    // 백엔드에 토큰 등록
    await registerDeviceToken(token.data);

    return token.data;
  }

  async function registerDeviceToken(pushToken: string): Promise<void> {
    const deviceId = await getDeviceId(); // UUID 또는 고유 ID 생성
    const platform = Platform.OS;

    await fetch(`${API_BASE_URL}/api/notifications/register-device`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pushToken,
        deviceId,
        platform,
      }),
    });
  }

  // 알림 수신 리스너 설정
  export function setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationTapped: (response: Notifications.NotificationResponse) => void
  ) {
    // 포그라운드 알림 수신
    const notifListener = Notifications.addNotificationReceivedListener(onNotificationReceived);

    // 알림 클릭 처리
    const respListener = Notifications.addNotificationResponseReceivedListener(onNotificationTapped);

    return { notificationListener: notifListener, responseListener: respListener };
  }
  ```

  - 파일: `apps/mobile/src/services/notifications.ts` (신규)
  - 푸시 알림 권한 요청
  - 푸시 토큰 등록
  - 알림 수신 핸들러 설정

- [ ] **T1.3.8**: 모바일 앱 - 푸시 알림 훅 구현

  ```typescript
  // apps/mobile/src/hooks/usePushNotifications.ts
  import { useEffect, useRef } from "react";
  import { useRouter } from "expo-router";
  import {
    registerForPushNotificationsAsync,
    setupNotificationListeners,
  } from "../services/notifications";
  import * as Notifications from "expo-notifications";

  export function usePushNotifications() {
    const router = useRouter();
    const notificationListener = useRef<Notifications.Subscription>();
    const responseListener = useRef<Notifications.Subscription>();

    useEffect(() => {
      // 앱 시작 시 푸시 토큰 등록
      registerForPushNotificationsAsync();

      // 알림 수신 리스너 설정
      const { notificationListener: notifListener, responseListener: respListener } =
        setupNotificationListeners(
          (notification) => {
            // 포그라운드 알림 수신 처리
            console.log("📬 Notification received:", notification);
          },
          (response) => {
            // 알림 클릭 처리
            const data = response.notification.request.content.data;
            if (data?.symbol) {
              router.push(`/stock/${data.symbol}`);
            }
          }
        );

      notificationListener.current = notifListener;
      responseListener.current = respListener;

      return () => {
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    }, [router]);
  }
  ```

  - 파일: `apps/mobile/src/hooks/usePushNotifications.ts` (신규)
  - 푸시 알림 초기화 및 리스너 관리
  - 알림 클릭 시 상세 화면 이동

- [ ] **T1.3.9**: 모바일 앱 - App.tsx에 푸시 알림 훅 통합

  ```typescript
  // apps/mobile/App.tsx
  import { usePushNotifications } from "./src/hooks/usePushNotifications";

  export default function App() {
    usePushNotifications(); // 푸시 알림 초기화

    return (
      // ... 기존 코드
    );
  }
  ```

  - 파일: `apps/mobile/App.tsx`
  - 앱 시작 시 푸시 알림 활성화

- [ ] **T1.3.10**: app.json에 푸시 알림 설정 추가

  ```json
  // apps/mobile/app.json
  {
    "expo": {
      "plugins": [
        [
          "expo-notifications",
          {
            "icon": "./assets/icon.png",
            "color": "#ffffff",
            "sounds": ["default"]
          }
        ]
      ]
    }
  }
  ```

  - 파일: `apps/mobile/app.json`
  - 푸시 알림 아이콘 및 사운드 설정

### US1.4: 통합 및 테스트

- [ ] **T1.4.1**: GitHub Actions에 알림 감지 단계 추가

  ```yaml
  # .github/workflows/etl-daily.yml
  - name: Detect Price Alerts
    run: |
      cd apps/web
      yarn etl:detect-alerts
    env:
      ENABLE_PRICE_ALERTS: true
      ALERT_CHANNELS: app,email
    continue-on-error: true  # 알림 실패해도 ETL은 계속
  ```

  - 파일: `.github/workflows/etl-daily.yml`
  - 일일 가격/이동평균 ETL 완료 후 자동 실행
  - `continue-on-error: true`로 알림 실패해도 ETL은 계속 진행

- [ ] **T1.4.2**: 로컬 테스트

  - [ ] 테스트 데이터로 조건 감지 확인
  - [ ] 이메일 전송 테스트 (실제 이메일 수신 확인)
  - [ ] 중복 알림 방지 확인 (같은 종목 2회 실행 시 1회만 알림)
  - [ ] 전일 데이터 없는 경우 에러 없이 처리 확인

- [ ] **T1.4.3**: 프로덕션 배포 전 검증

  - [ ] 환경 변수 설정 확인
  - [ ] 이메일 서비스 API 키 유효성 확인
  - [ ] 실제 ETL 실행 후 알림 전송 확인
  - [ ] 알림 내용 정확성 확인 (가격, 이동평균선 값 등)

## User Story 2: 알림 UI (향후 구현, P2)

### US2.0: 알림 목록 UI

- [ ] **T2.0.1**: 알림 벨 아이콘 컴포넌트
- [ ] **T2.0.2**: 알림 목록 모달/드로어
- [ ] **T2.0.3**: 알림 읽음/삭제 기능
- [ ] **T2.0.4**: 실시간 알림 업데이트 (폴링 또는 WebSocket)

**참고**: 초기 구현에서는 API만 구현하고, UI는 향후 추가

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
- 알림 채널 추가 용이 (앱, 이메일 외 SMS, 슬랙 등)

## 환경 변수 체크리스트

**Web (apps/web)**:
- [ ] `ENABLE_PRICE_ALERTS=true` (알림 활성화)
- [ ] `ALERT_CHANNELS=app,email` (알림 채널)
- [ ] `RESEND_API_KEY=re_xxxxx` (이메일 서비스 키)
- [ ] `NOTIFICATION_EMAIL_FROM=noreply@screener.com` (발신자)
- [ ] `NOTIFICATION_EMAIL_TO=user@example.com` (수신자, 쉼표로 구분)
- [ ] `EXPO_ACCESS_TOKEN=xxxxx` (선택사항, EAS Push 사용 시)

**Mobile (apps/mobile)**:
- [ ] `API_BASE_URL=https://your-api.com` (백엔드 API URL)

## 수락 기준

### 감지 로직
- [ ] ETL 실행 시 조건에 맞는 종목 정확히 감지
- [ ] 중복 알림 방지 (같은 종목, 같은 날 1회만)
- [ ] 전일 데이터가 없는 경우 에러 없이 처리

### 알림 전송
- [ ] 조건 감지 시 이메일 알림 전송 (실제 이메일 수신 확인)
- [ ] 알림 내용 정확성 확인 (종목, 가격, 이동평균선 값)
- [ ] 알림 실패 시 에러 로깅 (ETL은 계속 진행)

### 통합 테스트
- [ ] 테스트 데이터로 조건 감지 확인
- [ ] 실제 ETL 실행 후 알림 전송 확인
- [ ] GitHub Actions에서 자동 실행 확인

