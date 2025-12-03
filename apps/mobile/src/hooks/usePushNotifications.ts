import { useEffect, useRef } from "react";
import {
  registerForPushNotificationsAsync,
  setupNotificationListeners,
} from "../services/notifications";
import * as Notifications from "expo-notifications";

/**
 * 푸시 알림 훅
 * - 앱 시작 시 푸시 토큰 등록
 * - 알림 수신 및 클릭 처리
 * - 알림 클릭 시 상세 화면 이동 (향후 구현)
 */
export function usePushNotifications() {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // 앱 시작 시 푸시 토큰 등록
    registerForPushNotificationsAsync().catch((error) => {
      console.error("Failed to register for push notifications:", error);
    });

    // 알림 수신 리스너 설정
    const {
      notificationListener: notifListener,
      responseListener: respListener,
    } = setupNotificationListeners(
      (notification) => {
        // 포그라운드 알림 수신 처리
        console.log("📬 Notification received:", notification);
      },
      (response) => {
        // 알림 클릭 처리
        const data = response.notification.request.content.data;
        console.log("📱 Notification tapped:", data);

        // 향후 라우터를 사용하여 상세 화면 이동
        // if (data?.symbol) {
        //   router.push(`/stock/${data.symbol}`);
        // }
      }
    );

    notificationListener.current = notifListener;
    responseListener.current = respListener;

    return () => {
      // Cleanup: 리스너 제거
      // Subscription 객체의 remove() 메서드 사용
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);
}
