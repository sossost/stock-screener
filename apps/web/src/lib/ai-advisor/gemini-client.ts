/**
 * Gemini API 클라이언트
 * gemini-2.5-pro 모델을 사용하여 AI Trading Advisor 응답 생성
 */

import { GoogleGenAI } from "@google/genai";
import { getSystemInstruction, buildUserPrompt } from "./prompt-builder";
import type { AIAdvisorRequest, AIAdvisorResponse } from "@/types/ai-advisor";

// 사용하는 모델: gemini-2.5-pro
// 대안: gemini-2.5-flash (더 빠르지만 성능 낮음), gemini-1.5-pro-latest
const MODEL_NAME = "gemini-2.5-pro";

// API 타임아웃 및 재시도 설정
const API_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Gemini 클라이언트 초기화
 */
function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  return new GoogleGenAI({ apiKey });
}

/**
 * 재시도 로직이 포함된 API 호출 래퍼
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 마지막 시도가 아니면 백오프 후 재시도
      if (attempt < maxRetries) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError;
}

/**
 * AI Trading Advisor 분석 요청
 */
export async function generateTradingAnalysis(
  request: AIAdvisorRequest
): Promise<AIAdvisorResponse> {
  try {
    const client = createGeminiClient();
    const systemInstruction = getSystemInstruction();
    const userPrompt = buildUserPrompt(request);

    // System instruction과 user prompt를 결합
    const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;

    const response = await withRetry(async () => {
      return await client.models.generateContent({
        model: MODEL_NAME,
        contents: fullPrompt,
      });
    });

    const analysis = response.text;

    if (!analysis) {
      return {
        success: false,
        error: "분석 결과를 생성할 수 없습니다",
      };
    }

    return {
      success: true,
      analysis,
    };
  } catch (error) {
    console.error("[Gemini API] Error:", error);

    // 에러 타입별 처리
    if (error instanceof Error) {
      if (error.message.includes("API_KEY")) {
        return {
          success: false,
          error: "API 키가 유효하지 않습니다",
        };
      }
      if (error.message.includes("QUOTA") || error.message.includes("RATE")) {
        return {
          success: false,
          error: "API 호출 한도에 도달했습니다. 잠시 후 다시 시도해주세요",
        };
      }
    }

    return {
      success: false,
      error: "현재 분석을 이용할 수 없습니다",
    };
  }
}
