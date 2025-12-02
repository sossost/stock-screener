/**
 * AI Trading Advisor API
 * POST /api/ai-advisor
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateTradingAnalysis } from "@/lib/ai-advisor/gemini-client";
import { collectAdvisorData } from "@/lib/ai-advisor/data-collector";
import type { AIAdvisorResponse } from "@/types/ai-advisor";

const RequestSchema = z.object({
  symbol: z.string().min(1).max(10),
  currentPrice: z
    .union([
      z.number().positive("현재가는 양수여야 합니다"),
      z.string().transform((val) => {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) {
          throw new Error("현재가는 양수여야 합니다");
        }
        return num;
      }),
    ])
    .pipe(z.number().positive("현재가는 양수여야 합니다")),
});

/**
 * POST /api/ai-advisor
 * AI Trading Advisor 분석 요청
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = RequestSchema.safeParse(body);

    if (!validated.success) {
      console.error("[AI Advisor API] Validation error:", validated.error);
      const errorMessages = validated.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return NextResponse.json(
        {
          success: false,
          error: `유효하지 않은 요청입니다: ${errorMessages}`,
        },
        { status: 400 }
      );
    }

    const { symbol, currentPrice } = validated.data;

    // 데이터 수집
    const result = await collectAdvisorData(symbol, currentPrice);

    if (result.error || !result.data) {
      console.error(
        `[AI Advisor API] Failed to collect data for ${symbol}:`,
        result.error
      );
      return NextResponse.json(
        {
          success: false,
          error: result.error || "분석에 필요한 데이터가 부족합니다",
        },
        { status: 400 }
      );
    }

    // Gemini API 호출
    const response: AIAdvisorResponse = await generateTradingAnalysis(
      result.data
    );

    if (!response.success) {
      return NextResponse.json(response, { status: 500 });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[AI Advisor API] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "분석 중 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}
