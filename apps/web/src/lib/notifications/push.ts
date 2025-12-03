import {
  Expo,
  type ExpoPushMessage,
  type ExpoPushTicket,
} from "expo-server-sdk";
import { db } from "@/db/client";
import { deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AlertData } from "@/lib/alerts/types";
import { retryApiCall } from "@/etl/utils/retry";

// Expo 클라이언트 초기화 (lazy initialization for testing)
let expoClient: Expo | null = null;

function getExpoClient(): Expo {
  if (!expoClient) {
    expoClient = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN, // 선택사항, EAS Push 사용 시
    });
  }
  return expoClient;
}

// 푸시 알림 전송 타임아웃 (10초)
const PUSH_SEND_TIMEOUT_MS = 10_000;

// 재시도 설정
const PUSH_RETRY_OPTIONS = {
  maxAttempts: 3,
  baseDelay: 1000, // 1초
  maxDelay: 5000, // 5초
  backoffMultiplier: 2, // 지수 백오프
  jitter: true, // 지터 추가
};

/**
 * 여러 알림을 배치로 푸시 알림 전송
 * @param alerts 알림 데이터 배열
 * @param expoClient Expo 클라이언트 (테스트용, 기본값: 전역 expo)
 * @throws {Error} 푸시 알림 전송 실패 시
 */
export async function sendPushNotificationBatch(
  alerts: AlertData[],
  expoClient?: Expo
): Promise<void> {
  if (alerts.length === 0) {
    return;
  }

  const expo = expoClient || getExpoClient();

  // 활성화된 모든 디바이스 토큰 조회
  const tokens = await db
    .select()
    .from(deviceTokens)
    .where(eq(deviceTokens.isActive, true));

  if (tokens.length === 0) {
    console.log("⚠️ No active device tokens found");
    return;
  }

  // 종합 알림: 여러 알림을 하나의 메시지로 통합
  // 사용자 경험 개선: 10개 종목이면 10개 알림이 아닌 1개 종합 알림
  const messages: ExpoPushMessage[] = [];

  for (const token of tokens) {
    // Expo Push Token 유효성 검사
    if (!Expo.isExpoPushToken(token.pushToken)) {
      console.warn(`⚠️ Invalid push token: ${token.pushToken}`);
      continue;
    }

    messages.push({
      to: token.pushToken,
      sound: "default",
      title: `가격 알림: ${alerts.length}개 종목 20일선 돌파 감지`,
      body: `조건: 정배열 상태에서 20일선 돌파`,
      data: {
        alertType: alerts[0]?.alertType || "ma20_breakout_ordered",
        date: alerts[0]?.date || new Date().toISOString().split("T")[0],
        alertCount: alerts.length,
        // 알림 그룹화를 위한 식별자 (같은 날짜의 알림은 하나로 그룹화)
        threadId: `price-alert-${alerts[0]?.date || new Date().toISOString().split("T")[0]}`,
        // 상세 정보는 앱에서 API로 조회하도록 최소한의 정보만 포함
        // 35개 종목의 전체 정보는 data 크기 제한을 초과할 수 있으므로 제외
        // 앱에서 알림을 받으면 /api/alerts?date={date} 같은 API로 상세 정보 조회
      },
    });
  }

  if (messages.length === 0) {
    console.log("⚠️ No valid push messages to send");
    return;
  }

  console.log(
    `📤 Sending ${messages.length} push notification(s) to ${tokens.length} device(s)`
  );

  // 배치로 전송 (Expo는 최대 100개씩)
  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];
  const ticketToMessageMap: Map<number, ExpoPushMessage> = new Map();

  // 각 청크를 전송하고 티켓과 메시지 매핑 저장
  let ticketIndex = 0;
  for (const chunk of chunks) {
    try {
      // 타임아웃 및 재시도 로직이 포함된 푸시 알림 전송
      const ticketChunk = await retryApiCall(async () => {
        // 타임아웃 래퍼
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Push notification send timeout")),
            PUSH_SEND_TIMEOUT_MS
          );
        });

        const sendPromise = expo.sendPushNotificationsAsync(chunk);

        return await Promise.race([sendPromise, timeoutPromise]);
      }, PUSH_RETRY_OPTIONS);

      // 티켓과 메시지 매핑 저장
      for (let i = 0; i < ticketChunk.length; i++) {
        tickets.push(ticketChunk[i]);
        ticketToMessageMap.set(ticketIndex, chunk[i]);
        ticketIndex++;
      }
      console.log(
        `✅ Sent chunk ${chunks.indexOf(chunk) + 1}/${chunks.length} (${ticketChunk.length} messages)`
      );
    } catch (error) {
      console.error("❌ Failed to send push notifications:", error);
      // 개별 청크 실패해도 계속 진행
    }
  }

  console.log(`📬 Total tickets: ${tickets.length}`);
  const successCount = tickets.filter((t) => t.status === "ok").length;
  const errorCount = tickets.filter((t) => t.status === "error").length;
  console.log(`✅ Success: ${successCount}, ❌ Errors: ${errorCount}`);

  // 티켓 상세 정보 로깅
  tickets.forEach((ticket, i) => {
    if (ticket.status === "ok") {
      console.log(`✅ Ticket ${i + 1}: OK (ID: ${ticket.id || "N/A"})`);
    } else {
      console.log(`❌ Ticket ${i + 1}: ${ticket.status}`);
      console.log(`   Error: ${ticket.details?.error || "Unknown"}`);
      if (ticket.details?.error === "MessageTooBig") {
        console.log(`   ⚠️ Message too big! Reduce data payload size.`);
      }
    }
  });

  // 에러 처리: 티켓에서 에러 확인 및 비활성 토큰 처리
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (ticket.status === "error") {
      const error = ticket.details?.error;
      if (error === "DeviceNotRegistered" || error === "InvalidCredentials") {
        // 유효하지 않은 토큰은 비활성화
        const message = ticketToMessageMap.get(i);
        if (message?.to && typeof message.to === "string") {
          await db
            .update(deviceTokens)
            .set({ isActive: false })
            .where(eq(deviceTokens.pushToken, message.to));
          console.log(`⚠️ Deactivated invalid token: ${message.to}`);
        }
      }
    }
  }
}

/**
 * 단일 알림 푸시 전송 (하위 호환성 유지)
 * @param alert 알림 데이터
 * @param expoClient Expo 클라이언트 (테스트용, 기본값: 전역 expo)
 * @throws {Error} 푸시 알림 전송 실패 시
 */
export async function sendPushNotification(
  alert: AlertData,
  expoClient?: Expo
): Promise<void> {
  return sendPushNotificationBatch([alert], expoClient);
}

// 테스트를 위해 export
export { getExpoClient };
