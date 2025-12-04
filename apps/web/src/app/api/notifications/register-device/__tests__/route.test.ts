import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// DB 모킹
const mockInsert = vi.fn(() => ({
  values: vi.fn(() => ({
    onConflictDoUpdate: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("@/db/client", () => ({
  db: {
    insert: mockInsert,
  },
}));

describe("POST /api/notifications/register-device", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register device token successfully", async () => {
    const { POST } = await import("../route");
    const request = new NextRequest(
      "http://localhost:3000/api/notifications/register-device",
      {
        method: "POST",
        body: JSON.stringify({
          pushToken: "ExponentPushToken[test-token]",
          deviceId: "test-device-id",
          platform: "ios",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalled();
  });

  it("should return 400 when pushToken is missing", async () => {
    const { POST } = await import("../route");
    const request = new NextRequest(
      "http://localhost:3000/api/notifications/register-device",
      {
        method: "POST",
        body: JSON.stringify({
          deviceId: "test-device-id",
          platform: "ios",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    // zod 에러 메시지 형식: "Invalid input: expected string, received undefined"
    // 또는 커스텀 메시지: "pushToken은 필수입니다"
    expect(
      data.error.includes("pushToken") ||
        data.error.includes("Invalid input") ||
        data.error.includes("필수")
    ).toBe(true);
  });

  it("should return 400 when deviceId is missing", async () => {
    const { POST } = await import("../route");
    const request = new NextRequest(
      "http://localhost:3000/api/notifications/register-device",
      {
        method: "POST",
        body: JSON.stringify({
          pushToken: "ExponentPushToken[test-token]",
          platform: "ios",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    // zod 에러 메시지 형식: "Invalid input: expected string, received undefined"
    // 또는 커스텀 메시지: "deviceId는 필수입니다"
    expect(
      data.error.includes("deviceId") ||
        data.error.includes("Invalid input") ||
        data.error.includes("필수")
    ).toBe(true);
  });

  it("should return 400 when platform is invalid", async () => {
    const { POST } = await import("../route");
    const request = new NextRequest(
      "http://localhost:3000/api/notifications/register-device",
      {
        method: "POST",
        body: JSON.stringify({
          pushToken: "ExponentPushToken[test-token]",
          deviceId: "test-device-id",
          platform: "windows", // 잘못된 플랫폼
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("platform");
  });

  it("should return 500 when database error occurs", async () => {
    mockInsert.mockImplementation(() => {
      throw new Error("Database error");
    });

    const { POST } = await import("../route");
    const request = new NextRequest(
      "http://localhost:3000/api/notifications/register-device",
      {
        method: "POST",
        body: JSON.stringify({
          pushToken: "ExponentPushToken[test-token]",
          deviceId: "test-device-id",
          platform: "ios",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to register device");
  });
});
