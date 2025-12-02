/**
 * AI Advisor 분석 결과 파싱 유틸리티
 * 마크다운 형식의 분석 결과를 구조화된 데이터로 변환
 */

export type SignalType = "STRONG_BUY" | "WAIT" | "SELL" | "NO_TRADE";

export interface ParsedAnalysis {
  title: string;
  signal: {
    type: SignalType;
    headline?: string;
    riskReward?: string; // "1 : 4.2" 형식
  };
  summary: {
    currentStatus?: string;
    judgment?: string;
    keyPoint?: string;
  };
  strategy: {
    entry?: {
      price?: string;
      weight?: string; // "10% (Full)" 형식
      description?: string;
      isWaitPrice?: boolean; // 관망 상태일 때 대기 가격대인지
    };
    stopLoss?: {
      price?: string;
      lossPercent?: string; // "-3.3%" 형식
      description?: string;
    };
    target?: {
      first?: string; // "1차: $145.00 (2R)"
      final?: string; // "최종: $160.00"
      description?: string;
    };
  };
  riskCheck: {
    warnings: string[];
    reasons: string[]; // 분석 근거
  };
  rawText: string;
}

/**
 * 판단 텍스트를 신호 타입으로 변환
 */
function parseSignalType(judgment?: string): SignalType {
  if (!judgment) return "WAIT";

  const upper = judgment.toUpperCase();
  if (
    upper.includes("매수") &&
    (upper.includes("적기") || upper.includes("STRONG") || upper.includes("A+"))
  ) {
    return "STRONG_BUY";
  }
  if (upper.includes("매도") || upper.includes("SELL")) {
    return "SELL";
  }
  if (upper.includes("관망") || upper.includes("WAIT")) {
    return "WAIT";
  }
  if (upper.includes("매수")) {
    return "STRONG_BUY";
  }
  return "WAIT";
}

/**
 * 손익비 추출 (예: "1:3", "1 : 4.2" 등)
 */
function extractRiskReward(text: string): string | undefined {
  const match = text.match(/(\d+)\s*[:：]\s*(\d+(?:\.\d+)?)/);
  if (match) {
    return `${match[1]} : ${match[2]}`;
  }
  return undefined;
}

/**
 * 가격 추출 (예: "$135.50", "135.50", "$135.50 ~ $136.00" 등)
 */
function extractPrice(text: string): string | undefined {
  const match = text.match(
    /\$?\s*(\d+(?:\.\d+)?)(?:\s*~\s*\$?\s*(\d+(?:\.\d+)?))?/
  );
  if (match) {
    if (match[2]) {
      return `$${match[1]} ~ $${match[2]}`;
    }
    return `$${match[1]}`;
  }
  return undefined;
}

/**
 * 비중 추출 (예: "10%", "10% (Full)", "5% 이하" 등)
 */
function extractWeight(text: string): string | undefined {
  const match = text.match(/(\d+)\s*%\s*(?:\(([^)]+)\))?/);
  if (match) {
    return match[2] ? `${match[1]}% (${match[2]})` : `${match[1]}%`;
  }
  return undefined;
}

/**
 * 손실/수익 퍼센트 추출 (예: "-3.3%", "+12.9%" 등)
 */
function extractPercent(text: string): string | undefined {
  const match = text.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  if (match) {
    return `${match[1]}%`;
  }
  return undefined;
}

/**
 * 마크다운 분석 결과를 파싱
 */
export function parseAnalysis(
  markdown: string,
  symbol: string
): ParsedAnalysis {
  const result: ParsedAnalysis = {
    title: `${symbol} 진단 결과`,
    signal: {
      type: "WAIT",
    },
    summary: {},
    strategy: {},
    riskCheck: {
      warnings: [],
      reasons: [],
    },
    rawText: markdown,
  };

  // 요약 섹션 파싱
  const summaryMatch = markdown.match(/### 📋 요약\s*\n([\s\S]*?)(?=###|$)/);
  if (summaryMatch) {
    const summaryText = summaryMatch[1];
    const statusMatch = summaryText.match(/\*\*현재 상태:\*\*\s*(.+)/);
    const judgmentMatch = summaryText.match(
      /\*\*판단:\*\*\s*\*\*\[(.+?)\]\*\*/
    );
    const keyPointMatch = summaryText.match(/\*\*핵심 포인트:\*\*\s*(.+)/);

    if (statusMatch) {
      result.summary.currentStatus = statusMatch[1].trim();
    }
    if (judgmentMatch) {
      result.summary.judgment = judgmentMatch[1].trim();
      result.signal.type = parseSignalType(judgmentMatch[1].trim());
    }
    if (keyPointMatch) {
      result.summary.keyPoint = keyPointMatch[1].trim();
      result.signal.headline = keyPointMatch[1].trim();
    }
  }

  // 손익비 추출 (전체 텍스트에서)
  const riskReward = extractRiskReward(markdown);
  if (riskReward) {
    result.signal.riskReward = riskReward;
  }

  // 상세 전략 섹션 파싱
  const strategyMatch = markdown.match(
    /### 💡 상세 전략\s*\n([\s\S]*?)(?=###|$)/
  );
  if (strategyMatch) {
    const strategyText = strategyMatch[1];
    const entryMatch = strategyText.match(/\d+\.\s*\*\*진입\/대응:\*\*\s*(.+)/);
    const stopLossMatch = strategyText.match(
      /\*\*손절가\s*\(Stop Loss\):\*\*\s*(.+)/
    );
    const targetMatch = strategyText.match(
      /\*\*목표가\s*\(Target\):\*\*\s*(.+)/
    );

    if (entryMatch) {
      const entryText = entryMatch[1].trim();
      // 관망이나 진입 금지일 때는 "대기 가격대" 또는 "지지선" 키워드 확인
      const isWaitPrice =
        entryText.includes("지지") ||
        entryText.includes("대기") ||
        entryText.includes("확인 후");
      const price = extractPrice(entryText);

      result.strategy.entry = {
        price: price,
        weight: extractWeight(entryText),
        description: entryText,
        isWaitPrice: isWaitPrice, // 관망 상태일 때 대기 가격대인지 표시
      };
    }
    if (stopLossMatch) {
      const stopLossText = stopLossMatch[1].trim();
      result.strategy.stopLoss = {
        price: extractPrice(stopLossText),
        lossPercent: extractPercent(stopLossText),
        description: stopLossText,
      };
    }
    if (targetMatch) {
      const targetText = targetMatch[1].trim();
      // 1차와 최종 목표가 분리 시도
      const firstMatch = targetText.match(/(?:1차|1st)[:：]?\s*([^,]+)/i);
      const finalMatch = targetText.match(/(?:최종|final)[:：]?\s*([^,]+)/i);

      result.strategy.target = {
        first: firstMatch ? firstMatch[1].trim() : undefined,
        final: finalMatch ? finalMatch[1].trim() : targetText,
        description: targetText,
      };
    }
  }

  // 리스크 체크 섹션 파싱 (경고 사항)
  const riskMatch = markdown.match(
    /### ⚠️ 리스크 체크\s*\n([\s\S]*?)(?=###|##|$)/
  );
  if (riskMatch) {
    const riskText = riskMatch[1];
    // 리스트 항목 추출 (- 또는 * 로 시작하는 줄)
    const riskItems = riskText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("-") || line.startsWith("*"))
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter((line) => line.length > 0);

    result.riskCheck.warnings = riskItems;
  }

  // 분석 근거 섹션 파싱 (기술적 근거)
  const reasonMatch = markdown.match(
    /### 📝 분석 근거\s*\n([\s\S]*?)(?=###|##|$)/
  );
  if (reasonMatch) {
    const reasonText = reasonMatch[1];
    // 체크마크와 함께 나열된 항목 추출
    const reasonItems = reasonText
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.includes("✅") ||
          line.includes("✓") ||
          line.startsWith("-") ||
          line.startsWith("*")
      )
      .map((line) => {
        // 체크마크 제거
        line = line.replace(/[✅✓]\s*/, "").trim();
        // 리스트 마커 제거
        line = line.replace(/^[-*]\s*/, "").trim();
        return line;
      })
      .filter((line) => line.length > 0);

    result.riskCheck.reasons = reasonItems;
  } else {
    // 분석 근거 섹션이 없으면 전체 텍스트에서 체크마크 찾기 (하위 호환)
    const reasonMatches = markdown.matchAll(/[✅✓]\s*([^\n]+)/g);
    for (const match of reasonMatches) {
      result.riskCheck.reasons.push(match[1].trim());
    }
  }

  return result;
}
