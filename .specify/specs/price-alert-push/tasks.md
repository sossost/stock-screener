# 가격 알림 시스템 (푸시 알림) 작업 목록

**Branch**: `price-alert-push` | **Date**: 2025-12-03 | **Tasks**: [link]  
**Input**: 가격 알림 시스템 (푸시 알림) 스펙 기반 상세 작업 목록

**전제 조건**: 
- ✅ `price-alert-email` 피쳐 완료 (2025-12-03)
- ✅ 이메일 알림 정상 작동 중
- ✅ GitHub Actions 통합 완료

## User Story 1: 모바일 앱 푸시 알림 구현 (P1)

### US1.0: 백엔드 - 디바이스 토큰 관리

- [x] **T1.0.1**: 디바이스 토큰 테이블 생성 ✅

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
  - 마이그레이션 실행: `yarn db:push`

- [x] **T1.0.2**: 디바이스 토큰 등록 API ✅

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

### US1.1: 백엔드 - 푸시 알림 전송

- [x] **T1.1.1**: expo-server-sdk 패키지 설치 ✅

  ```bash
  yarn workspace web add expo-server-sdk
  ```

  - 파일: `apps/web/package.json`
  - Expo Push Notification Service 연동을 위한 패키지

- [x] **T1.1.2**: 푸시 알림 전송 함수 구현 ✅

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

- [ ] **T1.1.3**: 알림 조회 API 엔드포인트

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

### US1.2: ETL 통합

- [x] **T1.2.1**: ETL에 푸시 알림 통합 ✅

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

- [ ] **T1.2.2**: markAsNotified 함수 업데이트

  ```typescript
  // apps/web/src/etl/jobs/detect-price-alerts.ts
  async function markAsNotified(alert: AlertData): Promise<void> {
    const channels = process.env.ALERT_CHANNELS?.split(",") || [];
    
    await db.insert(priceAlerts).values({
      symbol: alert.symbol,
      alertType: alert.alertType,
      alertDate: alert.date,
      conditionData: {
        todayClose: alert.todayClose,
        todayMa20: alert.todayMa20,
        breakoutPercent: alert.breakoutPercent,
      },
      notificationChannels: channels, // ['app', 'email']
    });
  }
  ```

  - 파일: `apps/web/src/etl/jobs/detect-price-alerts.ts`
  - `notification_channels`에 `'app'` 포함

- [ ] **T1.2.3**: 환경 변수 설정

  ```env
  # .env.local 또는 .env
  ALERT_CHANNELS=app,email  # 'app' 추가
  EXPO_ACCESS_TOKEN=xxxxx (선택사항, EAS Push 사용 시)
  ```

  - 파일: `apps/web/.env.local` 또는 `apps/web/.env.example`
  - 푸시 알림 활성화를 위한 환경 변수 설정

### US1.3: 모바일 앱 - 푸시 알림 설정

- [x] **T1.3.1**: expo-notifications 패키지 설치 ✅

  ```bash
  cd apps/mobile
  yarn add expo-notifications
  yarn add expo-device
  ```

  - 파일: `apps/mobile/package.json`
  - 푸시 알림 수신을 위한 필수 패키지

- [x] **T1.3.2**: 푸시 알림 서비스 구현 ✅

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
    const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

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

- [x] **T1.3.3**: 푸시 알림 훅 구현 ✅

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

- [x] **T1.3.4**: App.tsx에 푸시 알림 훅 통합 ✅

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

- [x] **T1.3.5**: app.json에 푸시 알림 설정 추가 ✅

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

- [x] **T1.4.1**: 로컬 테스트 ✅

  - [x] 디바이스 토큰 등록 확인 ✅
  - [x] 푸시 알림 수신 확인 (포그라운드) ✅
  - [x] 푸시 알림 수신 확인 (백그라운드) ✅
  - [x] 실제 돌파 데이터로 테스트 완료 ✅
  - [x] 종합 알림 형식 검증 완료 ✅
  - [ ] 알림 클릭 시 상세 화면 이동 확인 (향후 구현)
  - [ ] 여러 디바이스에 동시 전송 확인 (향후 테스트)

- [x] **T1.4.2**: 프로덕션 배포 전 검증 ✅

  - [x] 환경 변수 설정 확인 ✅
  - [x] 실제 데이터로 푸시 알림 수신 확인 ✅
  - [x] 알림 내용 정확성 확인 ✅
  - [x] 에러 발생 시 로깅 확인 ✅
  - [x] 메시지 크기 제한 문제 해결 (data 필드 최소화) ✅

## 비기능 요구사항

### 성능
- 푸시 알림 전송은 비동기 처리 (ETL 블로킹 방지)
- 배치 전송으로 효율성 향상 (Expo는 최대 100개씩)

### 에러 처리
- 푸시 알림 전송 실패 시 로깅만 하고 ETL은 계속 진행
- 유효하지 않은 토큰은 자동으로 비활성화
- 알림 서비스 장애 시에도 ETL은 정상 완료
- 각 알림 전송은 독립적으로 처리 (하나 실패해도 나머지는 계속)

### 확장성
- 향후 사용자별 알림 설정 지원 가능
- 다중 디바이스 지원 (같은 사용자의 여러 디바이스)

## 환경 변수 체크리스트

**Web (apps/web)**:
- [ ] `ALERT_CHANNELS=app,email` (알림 채널)
- [ ] `EXPO_ACCESS_TOKEN=xxxxx` (선택사항, EAS Push 사용 시)

**Mobile (apps/mobile)**:
- [ ] `EXPO_PUBLIC_API_BASE_URL=https://your-api.com` (백엔드 API URL)

## 수락 기준

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
- [x] 테스트 스크립트 실행 후 푸시 알림 수신 확인 ✅
- [x] 실제 돌파 데이터로 테스트 완료 (35개 종목) ✅
- [x] 알림 내용 정확성 확인 ✅
- [x] 종합 알림 형식 검증 완료 ✅
- [ ] 여러 디바이스에 동시 전송 확인 (향후 테스트)
- [ ] 실제 ETL 실행 후 푸시 알림 수신 확인 (프로덕션 배포 후)

