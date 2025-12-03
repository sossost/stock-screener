import { Resend } from "resend";
import type { AlertData } from "@/lib/alerts/types";

// Resend 클라이언트 초기화 (lazy initialization for testing)
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * 여러 알림을 종합하여 하나의 이메일로 전송
 * @param alerts 알림 데이터 배열
 * @param resendClient Resend 클라이언트 (테스트용, 기본값: 전역 resend)
 * @throws {Error} 이메일 전송 실패 시
 */
export async function sendEmailAlertBatch(
  alerts: AlertData[],
  resendClient?: Resend
): Promise<void> {
  if (alerts.length === 0) {
    return;
  }

  const client = resendClient || getResendClient();
  // 환경 변수 검증
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  if (!process.env.NOTIFICATION_EMAIL_FROM) {
    throw new Error("NOTIFICATION_EMAIL_FROM environment variable is not set");
  }

  if (!process.env.NOTIFICATION_EMAIL_TO) {
    throw new Error("NOTIFICATION_EMAIL_TO environment variable is not set");
  }

  const subject = `[스크리너 알림] ${alerts.length}개 종목 20일선 돌파 감지`;
  const html = formatBatchEmailTemplate(alerts);

  // 수신자 목록 파싱 (쉼표로 구분)
  const recipients = process.env.NOTIFICATION_EMAIL_TO.split(",").map((email) =>
    email.trim()
  );

  const result = await client.emails.send({
    from: process.env.NOTIFICATION_EMAIL_FROM,
    to: recipients,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(`Failed to send email: ${result.error.message}`);
  }
}

/**
 * 단일 알림 이메일 전송 (하위 호환성 유지)
 * @param alert 알림 데이터
 * @param resendClient Resend 클라이언트 (테스트용, 기본값: 전역 resend)
 * @throws {Error} 이메일 전송 실패 시
 * @deprecated Use sendEmailAlertBatch for better performance
 */
export async function sendEmailAlert(
  alert: AlertData,
  resendClient?: Resend
): Promise<void> {
  return sendEmailAlertBatch([alert], resendClient);
}

/**
 * 단일 알림용 이메일 HTML 템플릿 생성 (하위 호환성 유지)
 * @param alert 알림 데이터
 * @returns HTML 문자열
 * @deprecated Use formatBatchEmailTemplate for batch emails
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatEmailTemplate(alert: AlertData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>가격 알림: ${alert.symbol}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        h2 {
          color: #2563eb;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 10px;
        }
        h3 {
          color: #1e40af;
          margin-top: 20px;
        }
        ul {
          list-style-type: none;
          padding: 0;
        }
        li {
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        li:last-child {
          border-bottom: none;
        }
        .breakout {
          color: #059669;
          font-weight: bold;
        }
        .info {
          background-color: #f3f4f6;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <h2>가격 알림: ${alert.symbol} (${alert.companyName})</h2>
      
      <div class="info">
        <p><strong>날짜:</strong> ${alert.date}</p>
        <p><strong>조건:</strong> 정배열 상태에서 20일선 돌파</p>
      </div>
      
      <h3>가격 정보</h3>
      <ul>
        <li><strong>종가:</strong> $${alert.todayClose.toFixed(2)}</li>
        <li><strong>20일선:</strong> $${alert.todayMa20.toFixed(2)}</li>
        <li><strong>50일선:</strong> $${alert.todayMa50.toFixed(2)}</li>
        <li><strong>100일선:</strong> $${alert.todayMa100.toFixed(2)}</li>
        <li><strong>200일선:</strong> $${alert.todayMa200.toFixed(2)}</li>
      </ul>
      
      <h3>돌파 정보</h3>
      <ul>
        <li><strong>전일 종가:</strong> $${alert.prevClose.toFixed(2)}</li>
        <li><strong>전일 20일선:</strong> $${alert.prevMa20.toFixed(2)}</li>
        <li class="breakout"><strong>돌파율:</strong> ${alert.breakoutPercent.toFixed(
          2
        )}%</li>
      </ul>
      
      <div class="info">
        <p><small>이 알림은 자동으로 생성되었습니다. 정배열 상태에서 20일선을 돌파한 종목에 대해 알림을 보냅니다.</small></p>
      </div>
    </body>
    </html>
  `;
}

/**
 * 여러 알림을 종합한 이메일 HTML 템플릿 생성
 * @param alerts 알림 데이터 배열
 * @returns HTML 문자열
 */
/**
 * 시가총액 포맷팅 (B, M, K 단위)
 */
function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1000000000000) {
    return `$${(marketCap / 1000000000000).toFixed(2)}T`;
  } else if (marketCap >= 1000000000) {
    return `$${(marketCap / 1000000000).toFixed(2)}B`;
  } else if (marketCap >= 1000000) {
    return `$${(marketCap / 1000000).toFixed(2)}M`;
  } else if (marketCap >= 1000) {
    return `$${(marketCap / 1000).toFixed(2)}K`;
  }
  return `$${marketCap.toFixed(2)}`;
}

function formatBatchEmailTemplate(alerts: AlertData[]): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://screener-mu.vercel.app";

  const tableRows = alerts
    .map(
      (alert) => `
      <tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer;" onclick="window.open('${baseUrl}/stock/${
        alert.symbol
      }', '_blank')">
        <td style="padding: 12px; text-align: left;">
          <a href="${baseUrl}/stock/${
        alert.symbol
      }" style="color: #2563eb; text-decoration: none; font-weight: 600;">
            ${alert.symbol}
          </a>
        </td>
        <td style="padding: 12px; text-align: left; color: #374151;">
          ${alert.companyName}
        </td>
        <td style="padding: 12px; text-align: left; color: #6b7280;">
          ${alert.sector || "-"}
        </td>
        <td style="padding: 12px; text-align: right; color: #111827; font-weight: 500;">
          $${alert.todayClose.toFixed(2)}
        </td>
        <td style="padding: 12px; text-align: right; color: #6b7280; font-size: 13px;">
          $${alert.todayMa20.toFixed(2)}
        </td>
        <td style="padding: 12px; text-align: right; color: #6b7280; font-size: 12px;">
          ${alert.marketCap ? formatMarketCap(alert.marketCap) : "-"}
        </td>
        <td style="padding: 12px; text-align: right;">
          <span style="color: #059669; font-weight: bold; font-size: 14px;">
            ${
              alert.breakoutPercent > 0 ? "+" : ""
            }${alert.breakoutPercent.toFixed(2)}%
          </span>
        </td>
        <td style="padding: 12px; text-align: right; font-size: 13px;">
          <span style="color: ${
            alert.priceChangePercent >= 0 ? "#059669" : "#dc2626"
          };">
            ${
              alert.priceChangePercent > 0 ? "+" : ""
            }${alert.priceChangePercent.toFixed(2)}%
          </span>
        </td>
        <td style="padding: 12px; text-align: right; font-size: 13px;">
          <span style="color: ${
            alert.volumeChangePercent >= 0 ? "#059669" : "#6b7280"
          };">
            ${
              alert.volumeChangePercent > 0 ? "+" : ""
            }${alert.volumeChangePercent.toFixed(1)}%
          </span>
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>가격 알림: ${alerts.length}개 종목</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9fafb;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        h2 {
          color: #2563eb;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 10px;
          margin-top: 0;
        }
        .summary {
          background-color: #eff6ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #2563eb;
        }
        .summary p {
          margin: 5px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background-color: #ffffff;
        }
        thead {
          background-color: #f3f4f6;
        }
        th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }
        th:last-child {
          text-align: right;
        }
        tbody tr:hover {
          background-color: #f9fafb;
        }
        tbody tr:last-child {
          border-bottom: none;
        }
        a {
          color: #2563eb;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>가격 알림: ${alerts.length}개 종목 20일선 돌파 감지</h2>
        
        <div class="summary">
          <p><strong>발생 일자:</strong> ${alerts[0]?.date || "N/A"}</p>
          <p><strong>조건:</strong> 정배열 상태에서 20일선 돌파</p>
          <p><strong>감지된 종목 수:</strong> ${alerts.length}개</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>티커</th>
              <th>종목명</th>
              <th>섹터</th>
              <th style="text-align: right;">종가</th>
              <th style="text-align: right;">20일선</th>
              <th style="text-align: right;">시가총액</th>
              <th style="text-align: right;">돌파율</th>
              <th style="text-align: right;">전일대비</th>
              <th style="text-align: right;">거래량변동</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>이 알림은 자동으로 생성되었습니다. 정배열 상태에서 20일선을 돌파한 종목에 대해 알림을 보냅니다.</p>
          <p>각 종목을 클릭하면 상세 정보 페이지로 이동합니다.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 테스트를 위해 export
export { getResendClient };
