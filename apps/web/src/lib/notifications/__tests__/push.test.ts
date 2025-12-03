import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AlertData } from "@/lib/alerts/types";
import { ALERT_TYPES } from "@/lib/alerts/constants";

// retryApiCall 모킹
vi.mock("@/etl/utils/retry", () => ({
  retryApiCall: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

// DB 모킹
const mockSelect = vi.fn(() => ({
  from: vi.fn(() => ({
    where: vi.fn(() => Promise.resolve([])),
  })),
}));

const mockUpdate = vi.fn(() => ({
  set: vi.fn(() => ({
    where: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("@/db/client", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}));

// Expo 모킹
const mockChunkPushNotifications = vi.fn((messages) => [messages]);
const mockSendPushNotificationsAsync = vi.fn().mockResolvedValue([
  {
    status: "ok",
    id: "test-ticket-id",
  },
]);

const mockIsExpoPushToken = vi.fn().mockReturnValue(true);

vi.mock("expo-server-sdk", () => {
  class MockExpo {
    chunkPushNotifications = mockChunkPushNotifications;
    sendPushNotificationsAsync = mockSendPushNotificationsAsync;
    static isExpoPushToken = mockIsExpoPushToken;

    constructor(options?: { accessToken?: string }) {
      // 생성자에서 options는 무시 (테스트용)
    }
  }

  return {
    Expo: MockExpo,
  };
});

describe("sendPushNotificationBatch", () => {
  const mockAlert: AlertData = {
    symbol: "AAPL",
    companyName: "Apple Inc.",
    sector: "Technology",
    marketCap: 2_500_000_000_000,
    alertType: ALERT_TYPES.MA20_BREAKOUT_ORDERED,
    todayClose: 150.25,
    todayMa20: 148.5,
    todayMa50: 145.0,
    todayMa100: 140.0,
    todayMa200: 135.0,
    prevClose: 147.0,
    prevMa20: 148.0,
    todayVolume: 50000000,
    prevVolume: 40000000,
    breakoutPercent: 1.52,
    priceChangePercent: 2.21,
    volumeChangePercent: 25.0,
    date: "2025-12-03",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EXPO_ACCESS_TOKEN = "test_token";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return early when alerts array is empty", async () => {
    const { sendPushNotificationBatch } = await import("../push");
    await sendPushNotificationBatch([]);
    // DB 조회가 호출되지 않아야 함
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("should log warning when no active device tokens found", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendPushNotificationBatch } = await import("../push");

    await sendPushNotificationBatch([mockAlert]);

    expect(consoleSpy).toHaveBeenCalledWith("⚠️ No active device tokens found");

    consoleSpy.mockRestore();
  });

  // 실제 디바이스 토큰이 있을 때의 테스트는 통합 테스트에서 수행
});
