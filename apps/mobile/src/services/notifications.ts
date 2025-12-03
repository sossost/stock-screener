import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";

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

/**
 * 디바이스 ID 생성 또는 가져오기
 * @returns 고유 디바이스 ID
 */
async function getDeviceId(): Promise<string> {
  // AsyncStorage나 SecureStore를 사용할 수도 있지만,
  // 간단하게 기기 정보 기반으로 고유 ID 생성
  const deviceInfo = `${Platform.OS}-${Device.modelName || "unknown"}`;
  const deviceId = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    deviceInfo
  );
  return deviceId.substring(0, 32); // 32자리로 제한
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

    const response = await fetch(
      `${API_BASE_URL}/api/notifications/register-device`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
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
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  // 백엔드에 토큰 등록
  await registerDeviceToken(token.data);

  return token.data;
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
