"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/error-state";

interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  avgRMultiple: number | null;
  maxProfit: number;
  maxLoss: number;
  mistakeStats: Record<string, number>;
  openTrades: number;
}

// 스켈레톤 컴포넌트
function StatsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-7 w-28 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 요약 카드 스켈레톤 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
              <div className="h-5 w-16 bg-gray-100 rounded mb-2" />
              <div className="h-8 w-20 bg-gray-200 rounded mb-1" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>

        {/* 최대 손익 스켈레톤 */}
        <div className="bg-white rounded-xl border p-6 animate-pulse">
          <div className="h-6 w-24 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-2 gap-8">
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="h-5 w-16 bg-gray-100 rounded mb-1" />
                <div className="h-7 w-24 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* 태그 스켈레톤 */}
        <div className="bg-white rounded-xl border p-6 animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <div className="h-5 w-20 bg-gray-100 rounded" />
                  <div className="h-5 w-16 bg-gray-100 rounded" />
                </div>
                <div className="h-2 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function StatsClient() {
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/trades/stats");
        if (!res.ok) throw new Error("통계 조회 실패");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류 발생");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    const sign = value >= 0 ? "+" : "-";
    if (absValue >= 1000) {
      return `${sign}$${(absValue / 1000).toFixed(1)}K`;
    }
    return `${sign}$${absValue.toFixed(0)}`;
  };

  if (loading) {
    return <StatsSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorState
          message={error}
          backHref="/trades"
          backLabel="매매일지로 돌아가기"
        />
      </div>
    );
  }

  if (!stats) return null;

  const mistakeEntries = Object.entries(stats.mistakeStats).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="📊 매매 통계" backHref="/trades" />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 요약 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500 mb-1">총 매매</p>
            <p className="text-2xl font-bold">{stats.totalTrades}</p>
            <p className="text-xs text-gray-400 mt-1">
              진행중 {stats.openTrades}건
            </p>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500 mb-1">승률</p>
            <p
              className={`text-2xl font-bold ${
                stats.winRate >= 50 ? "text-green-600" : "text-red-600"
              }`}
            >
              {stats.winRate.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.winningTrades}승 {stats.losingTrades}패
            </p>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500 mb-1">총 손익</p>
            <p
              className={`text-2xl font-bold ${
                stats.totalPnl >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(stats.totalPnl)}
            </p>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500 mb-1">평균 R</p>
            <p
              className={`text-2xl font-bold ${
                stats.avgRMultiple != null && stats.avgRMultiple >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {stats.avgRMultiple != null
                ? `${stats.avgRMultiple.toFixed(2)}R`
                : "-"}
            </p>
          </div>
        </div>

        {/* 최대 손익 */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">💰 최대 손익</h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-500 mb-1">최대 이익</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(stats.maxProfit)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">최대 손실</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(stats.maxLoss)}
              </p>
            </div>
          </div>
        </div>

        {/* 실수 유형 통계 */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">🏷️ 매매 복기 태그</h2>
          {mistakeEntries.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              아직 복기 데이터가 없습니다
            </p>
          ) : (
            <div className="space-y-3">
              {mistakeEntries.map(([tag, count]) => {
                const percentage =
                  stats.totalTrades > 0
                    ? (count / stats.totalTrades) * 100
                    : 0;
                const isSuccess = tag === "원칙준수";

                return (
                  <div key={tag}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm ${
                          isSuccess ? "text-green-600" : "text-gray-600"
                        }`}
                      >
                        {isSuccess && "✅ "}
                        {tag}
                      </span>
                      <span className="text-sm text-gray-500">
                        {count}건 ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isSuccess ? "bg-green-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {stats.totalTrades === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              완료된 매매가 없어 통계를 표시할 수 없습니다
            </p>
            <Button variant="link" asChild>
              <Link href="/trades">매매 시작하기</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

