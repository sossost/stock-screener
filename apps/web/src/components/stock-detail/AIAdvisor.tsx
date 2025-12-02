"use client";

import {
  parseAnalysis,
  type SignalType,
} from "@/lib/ai-advisor/parse-analysis";
import ReactMarkdown from "react-markdown";
import type { AIAdvisorResponse } from "@/types/ai-advisor";

interface AIAdvisorProps {
  symbol: string;
  data: AIAdvisorResponse | null;
  isLoading: boolean;
  error: string | null;
}

const SIGNAL_CONFIG: Record<
  SignalType,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  STRONG_BUY: {
    label: "매수 적기",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
  },
  WAIT: {
    label: "관망/확인 요망",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
  },
  SELL: {
    label: "매도",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
  },
  NO_TRADE: {
    label: "진입 금지",
    color: "text-gray-700",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-300",
  },
};

export function AIAdvisor({ symbol, data, isLoading, error }: AIAdvisorProps) {
  const parsed = data?.analysis ? parseAnalysis(data.analysis, symbol) : null;
  const signalConfig = parsed
    ? SIGNAL_CONFIG[parsed.signal.type]
    : SIGNAL_CONFIG.WAIT;

  // 분석 결과가 없으면 아무것도 표시하지 않음
  if (!parsed && !isLoading && !error) {
    return null;
  }

  return (
    <div className="p-3">
      {isLoading && (
        <div className="space-y-3">
          {/* 신호등 스켈레톤 */}
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-3 w-full animate-pulse rounded bg-gray-200" />
          </div>
          {/* 전략 카드 스켈레톤 */}
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`rounded-lg border bg-gray-50 p-3 ${
                  i === 3 ? "flex-1" : "flex-shrink-0 min-w-[90px]"
                }`}
              >
                <div className="mb-2 h-3 w-12 animate-pulse rounded bg-gray-200" />
                <div className="h-5 w-full animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {parsed && (
        <div className="space-y-2.5">
          {/* 1. 상단: 판단 & 신호등 */}
          <div
            className={`rounded-lg border ${signalConfig.borderColor} ${signalConfig.bgColor} p-2.5`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${signalConfig.color} ${signalConfig.bgColor} border ${signalConfig.borderColor}`}
                >
                  {signalConfig.label}
                </span>
                {parsed.signal.riskReward && (
                  <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    손익비 {parsed.signal.riskReward}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                리스크: 낮음
              </span>
            </div>
            {parsed.signal.headline && (
              <p className="text-sm text-gray-900 leading-snug line-clamp-3">
                {parsed.signal.headline}
              </p>
            )}
          </div>

          {/* 2. 중단: 전략 실행 가이드 */}
          <div className="grid gap-2.5 sm:grid-cols-3">
            {/* 진입 */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-2.5">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {parsed.signal.type === "WAIT" ||
                parsed.signal.type === "NO_TRADE"
                  ? "대기"
                  : "진입"}
              </p>
              <div className="text-base font-semibold text-gray-900">
                {parsed.strategy.entry?.price ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{parsed.strategy.entry.price}</ReactMarkdown>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
              {parsed.strategy.entry?.weight &&
                parsed.signal.type === "STRONG_BUY" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {parsed.strategy.entry.weight}
                  </p>
                )}
              {(parsed.signal.type === "WAIT" ||
                parsed.signal.type === "NO_TRADE") && (
                <p className="mt-1 text-xs text-amber-600 italic">
                  {parsed.signal.type === "NO_TRADE"
                    ? "진입 불가"
                    : "지지선 확인 필요"}
                </p>
              )}
            </div>

            {/* 손절 */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                손절
              </p>
              <div className="text-base font-semibold text-red-700">
                {parsed.strategy.stopLoss?.price ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>
                      {parsed.strategy.stopLoss.price}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
              {parsed.strategy.stopLoss?.lossPercent && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {parsed.strategy.stopLoss.lossPercent}
                </p>
              )}
            </div>

            {/* 목표 */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                목표
              </p>
              <div className="space-y-0.5">
                {parsed.strategy.target?.first && (
                  <div className="text-sm font-semibold text-gray-900">
                    <span className="text-xs text-muted-foreground">1차: </span>
                    <div className="prose prose-sm max-w-none inline">
                      <ReactMarkdown>
                        {parsed.strategy.target.first}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                {parsed.strategy.target?.final && (
                  <div className="text-sm font-semibold text-gray-900">
                    <span className="text-xs text-muted-foreground">
                      최종:{" "}
                    </span>
                    <div className="prose prose-sm max-w-none inline">
                      <ReactMarkdown>
                        {parsed.strategy.target.final}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                {!parsed.strategy.target?.first &&
                  !parsed.strategy.target?.final && (
                    <span className="text-muted-foreground">-</span>
                  )}
              </div>
            </div>
          </div>

          {/* 3. 하단: 리스크 체크 & 근거 */}
          {parsed.riskCheck.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5">
              <h4 className="mb-1.5 text-sm font-semibold text-amber-900">
                ⚠️ 경고 사항
              </h4>
              <ul className="space-y-1 text-sm text-amber-800">
                {parsed.riskCheck.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-0.5 text-amber-600">•</span>
                    <div className="prose prose-sm max-w-none text-amber-800">
                      <ReactMarkdown>{String(warning)}</ReactMarkdown>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.riskCheck.reasons.length > 0 && (
            <div className="rounded-lg border bg-gray-50 p-2.5">
              <h4 className="mb-1.5 text-sm font-semibold text-gray-900">
                분석 근거
              </h4>
              <ul className="space-y-1 text-sm text-gray-700">
                {parsed.riskCheck.reasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-0.5 text-green-600">✓</span>
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <ReactMarkdown>{String(reason)}</ReactMarkdown>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
