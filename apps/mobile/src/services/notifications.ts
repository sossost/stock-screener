import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

// 알림 핸들러 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DEVICE_ID_KEY = "device_unique_id";

/**
 * UUID v4 생성 (expo-crypto의 randomBytes 사용)
 * @returns UUID v4 문자열
 */
async function generateUUID(): Promise<string> {
  // 16바이트 랜덤 데이터 생성
  const bytes = await Crypto.getRandomBytesAsync(16);

  // UUID v4 형식으로 변환
  // bytes[6]의 상위 4비트를 0100으로 설정 (version 4)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // bytes[8]의 상위 2비트를 10으로 설정 (variant)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // 16진수 문자열로 변환
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // UUID 형식으로 포맷팅: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join("-");
}

/**
 * 디바이스 ID 생성 또는 가져오기
 * @returns 고유 디바이스 ID
 */
async function getDeviceId(): Promise<string> {
  // SecureStore에서 기존 ID 조회
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

  if (!deviceId) {
    // 새 UUID 생성 및 저장
    deviceId = await generateUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

// 타임아웃 상수
const REGISTER_TIMEOUT_MS = 10_000; // 10초

/**
 * 타임아웃이 포함된 fetch 래퍼
 */
function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}

/**
 * 백엔드에 디바이스 토큰 등록
 * @param pushToken Expo 푸시 토큰
 */
async function registerDeviceToken(pushToken: string): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    const platform = Platform.OS;
    // API 베이스 URL 설정
    // 환경 변수가 없으면 프로덕션 URL 사용
    // 로컬 테스트 시 .env.local에 EXPO_PUBLIC_API_BASE_URL=http://localhost:3000 설정
    const API_BASE_URL =
      process.env.EXPO_PUBLIC_API_BASE_URL || "https://screener-mu.vercel.app";

    const requestBody = {
      pushToken,
      deviceId,
      platform,
    };

    console.log("📤 Registering device token:", {
      url: `${API_BASE_URL}/api/notifications/register-device`,
      deviceId,
      platform,
      pushTokenLength: pushToken.length,
    });

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/notifications/register-device`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
      REGISTER_TIMEOUT_MS
    );

    console.log("📥 Response status:", response.status, response.statusText);

    // 응답 본문 읽기 (한 번만 읽을 수 있으므로 먼저 읽음)
    const contentType = response.headers.get("content-type");
    let responseText = "";
    let responseData: unknown = null;

    try {
      responseText = await response.text();
      console.log("📥 Response body:", responseText);

      if (responseText && contentType?.includes("application/json")) {
        responseData = JSON.parse(responseText);
      }
    } catch (error) {
      console.error("❌ Failed to parse response:", error);
    }

    if (!response.ok) {
      const errorMessage =
        (responseData &&
        typeof responseData === "object" &&
        "error" in responseData
          ? (responseData.error as string)
          : null) ||
        response.statusText ||
        "Unknown error";
      console.error("❌ API error:", {
        status: response.status,
        statusText: response.statusText,
        error:
          responseData &&
          typeof responseData === "object" &&
          "error" in responseData
            ? responseData.error
            : null,
        details:
          responseData &&
          typeof responseData === "object" &&
          "details" in responseData
            ? responseData.details
            : null,
        fullResponse: responseData,
        rawText: responseText,
      });
      throw new Error(`Failed to register device token: ${errorMessage}`);
    }

    console.log("✅ Device token registered successfully");
  } catch (error) {
    console.error("❌ Failed to register device token:", error);
    if (error instanceof Error) {
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
    throw error;
  }
}

/**
 * 푸시 알림 권한 요청 및 토큰 등록
 * @returns Expo 푸시 토큰 또는 null
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
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
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    // 백엔드에 토큰 등록
    await registerDeviceToken(token.data);

    return token.data;
  } catch (error) {
    console.error("❌ Failed to get push token:", error);
    return null;
  }
}

/**
 * 알림 수신 리스너 설정
 * @param onNotificationReceived 포그라운드 알림 수신 핸들러
 * @param onNotificationTapped 알림 클릭 핸들러
 * @returns 리스너 구독 객체 (cleanup용)
 */
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationTapped: (response: Notifications.NotificationResponse) => void
): {
  notificationListener: Notifications.Subscription;
  responseListener: Notifications.Subscription;
} {
  // 포그라운드 알림 수신
  const notifListener = Notifications.addNotificationReceivedListener(
    onNotificationReceived
  );

  // 알림 클릭 처리
  const respListener =
    Notifications.addNotificationResponseReceivedListener(onNotificationTapped);

  return {
    notificationListener: notifListener,
    responseListener: respListener,
  };
}
