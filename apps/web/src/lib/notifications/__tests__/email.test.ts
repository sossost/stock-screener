import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendEmailAlert } from "../email";
import type { AlertData } from "@/lib/alerts/types";
import { ALERT_TYPES } from "@/lib/alerts/constants";
import type { Resend } from "resend";

describe("sendEmailAlert", () => {
  const mockAlert: AlertData = {
    symbol: "AAPL",
    companyName: "Apple Inc.",
    sector: "Technology",
    marketCap: 2500000000000,
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

  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("should send email successfully when all environment variables are set", async () => {
    // 환경 변수 설정
    process.env.RESEND_API_KEY = "test_api_key";
    process.env.NOTIFICATION_EMAIL_FROM = "noreply@test.com";
    process.env.NOTIFICATION_EMAIL_TO = "user@test.com";

    // Mock Resend 클라이언트
    const mockResendInstance = {
      emails: {
        send: vi
          .fn()
          .mockResolvedValue({ data: { id: "test-id" }, error: null }),
      },
    } as unknown as Resend;

    await sendEmailAlert(mockAlert, mockResendInstance);

    expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
      from: "noreply@test.com",
      to: ["user@test.com"],
      subject: "[스크리너 알림] 1개 종목 20일선 돌파 감지",
      html: expect.stringContaining("Apple Inc."),
    });
  });

  it("should parse multiple recipients from NOTIFICATION_EMAIL_TO", async () => {
    process.env.RESEND_API_KEY = "test_api_key";
    process.env.NOTIFICATION_EMAIL_FROM = "noreply@test.com";
    process.env.NOTIFICATION_EMAIL_TO =
      "user1@test.com, user2@test.com, user3@test.com";

    const mockResendInstance = {
      emails: {
        send: vi
          .fn()
          .mockResolvedValue({ data: { id: "test-id" }, error: null }),
      },
    } as unknown as Resend;

    await sendEmailAlert(mockAlert, mockResendInstance);

    expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["user1@test.com", "user2@test.com", "user3@test.com"],
      })
    );
  });

  it("should throw error when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.NOTIFICATION_EMAIL_FROM = "noreply@test.com";
    process.env.NOTIFICATION_EMAIL_TO = "user@test.com";

    const mockResendInstance = {
      emails: {
        send: vi.fn(),
      },
    } as unknown as Resend;

    await expect(sendEmailAlert(mockAlert, mockResendInstance)).rejects.toThrow(
      "RESEND_API_KEY environment variable is not set"
    );
  });

  it("should throw error when NOTIFICATION_EMAIL_FROM is not set", async () => {
    process.env.RESEND_API_KEY = "test_api_key";
    delete process.env.NOTIFICATION_EMAIL_FROM;
    process.env.NOTIFICATION_EMAIL_TO = "user@test.com";

    const mockResendInstance = {
      emails: {
        send: vi.fn(),
      },
    } as unknown as Resend;

    await expect(sendEmailAlert(mockAlert, mockResendInstance)).rejects.toThrow(
      "NOTIFICATION_EMAIL_FROM environment variable is not set"
    );
  });

  it("should throw error when NOTIFICATION_EMAIL_TO is not set", async () => {
    process.env.RESEND_API_KEY = "test_api_key";
    process.env.NOTIFICATION_EMAIL_FROM = "noreply@test.com";
    delete process.env.NOTIFICATION_EMAIL_TO;

    const mockResendInstance = {
      emails: {
        send: vi.fn(),
      },
    } as unknown as Resend;

    await expect(sendEmailAlert(mockAlert, mockResendInstance)).rejects.toThrow(
      "NOTIFICATION_EMAIL_TO environment variable is not set"
    );
  });

  it("should throw error when Resend API returns an error", async () => {
    process.env.RESEND_API_KEY = "test_api_key";
    process.env.NOTIFICATION_EMAIL_FROM = "noreply@test.com";
    process.env.NOTIFICATION_EMAIL_TO = "user@test.com";

    const mockResendInstance = {
      emails: {
        send: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Invalid API key" },
        }),
      },
    } as unknown as Resend;

    await expect(sendEmailAlert(mockAlert, mockResendInstance)).rejects.toThrow(
      "Failed to send email: Invalid API key"
    );
  });

  it("should include all alert data in email subject and HTML", async () => {
    process.env.RESEND_API_KEY = "test_api_key";
    process.env.NOTIFICATION_EMAIL_FROM = "noreply@test.com";
    process.env.NOTIFICATION_EMAIL_TO = "user@test.com";

    const mockSend = vi
      .fn()
      .mockResolvedValue({ data: { id: "test-id" }, error: null });

    const mockResendInstance = {
      emails: {
        send: mockSend,
      },
    } as unknown as Resend;

    await sendEmailAlert(mockAlert, mockResendInstance);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArgs = mockSend.mock.calls[0][0];
    const html = callArgs.html as string;

    // 제목 확인 (배치 전송으로 변경됨)
    expect(callArgs.subject).toBe("[스크리너 알림] 1개 종목 20일선 돌파 감지");

    // HTML 내용 확인 (테이블 형태)
    expect(html).toContain("Apple Inc.");
    expect(html).toContain("AAPL");
    expect(html).toContain("2025-12-03");
    expect(html).toContain("$150.25"); // todayClose
    expect(html).toContain("$148.50"); // todayMa20
    expect(html).toContain("Technology"); // sector
    expect(html).toContain("$2.50T"); // marketCap (포맷팅됨)
    expect(html).toContain("1.52%"); // breakoutPercent
    expect(html).toContain("+2.21%"); // priceChangePercent (양수는 + 표시)
    expect(html).toContain("+25.0%"); // volumeChangePercent (양수는 + 표시)
    expect(html).toContain("정배열 상태에서 20일선 돌파");
  });
});
