"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { formatYLabel, formatXLabel } from "@/utils/chart-format";
import { Button } from "@/components/ui/button";
import AssetFlowTooltip from "./AssetFlowTooltip";

interface AssetSnapshot {
  date: string;
  totalAssets: number;
  cash: number;
  positionValue: number;
}

type Period = "1M" | "3M" | "ALL";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "1M", label: "1개월" },
  { value: "3M", label: "3개월" },
  { value: "ALL", label: "전체" },
];

export default function AssetFlowChart({
  currentTotalAssets,
  currentCash,
  currentPositionValue,
}: {
  currentTotalAssets?: number;
  currentCash?: number;
  currentPositionValue?: number;
}) {
  const [period, setPeriod] = useState<Period>("1M");
  const [data, setData] = useState<AssetSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredData, setHoveredData] = useState<AssetSnapshot | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/trades/assets?period=${period}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        const snapshots = await res.json();
        setData(snapshots);
      } catch (error) {
        console.error("Failed to fetch asset snapshots:", error);
        // TODO: 사용자에게 에러 메시지 표시 (토스트 등)
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  useEffect(() => {
    if (
      currentTotalAssets != null &&
      currentCash != null &&
      currentPositionValue != null &&
      currentTotalAssets > 0
    ) {
      const saveSnapshot = async () => {
        try {
          const res = await fetch("/api/trades/assets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: new Date().toISOString(),
              totalAssets: currentTotalAssets,
              cash: currentCash,
              positionValue: currentPositionValue,
            }),
          });
          if (!res.ok) {
            throw new Error(`Failed to save asset snapshot: ${res.status}`);
          }
        } catch (error) {
          console.error("Failed to save asset snapshot:", error);
          // 실패해도 치명적이지 않으므로 조용히 처리
        }
      };
      saveSnapshot();
    }
  }, [currentTotalAssets, currentCash, currentPositionValue]);

  const chartData = useMemo(() => {
    const result = [...data];
    if (
      currentTotalAssets != null &&
      currentCash != null &&
      currentPositionValue != null &&
      currentTotalAssets > 0
    ) {
      const today = new Date().toISOString().split("T")[0];
      const lastDate = result[result.length - 1]?.date?.split("T")[0];
      if (lastDate !== today) {
        result.push({
          date: new Date().toISOString(),
          totalAssets: currentTotalAssets,
          cash: currentCash,
          positionValue: currentPositionValue,
        });
      }
    }
    return result;
  }, [data, currentTotalAssets, currentCash, currentPositionValue]);

  const chartCalc = useMemo(() => {
    if (chartData.length === 0) return null;
    const values = chartData.map((d) => d.totalAssets);
    const dataMax = Math.max(...values);
    const max = Math.ceil((dataMax * 1.1) / 1000) * 1000;
    return { max, min: 0 };
  }, [chartData]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (chartData.length === 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (chartData.length - 1));
    if (index >= 0 && index < chartData.length) {
      setHoveredData(chartData[index]);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  // 빈 상태
  if (chartData.length === 0 && !loading) {
    return (
      <div className="h-full flex flex-col">
        <Header period={period} onPeriodChange={setPeriod} />
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
          데이터 없음
        </div>
      </div>
    );
  }

  // SVG 경로 생성
  const getPath = () => {
    if (!chartCalc || chartData.length === 0) return { line: "", area: "" };

    const w = 100; // percentage
    const h = 100;

    const points = chartData.map((d, i) => {
      const x = chartData.length > 1 ? (i / (chartData.length - 1)) * w : w / 2;
      const y =
        h -
        ((d.totalAssets - chartCalc.min) / (chartCalc.max - chartCalc.min)) * h;
      return { x, y };
    });

    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
    const area =
      line + ` L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;

    return { line, area };
  };

  const { line, area } = getPath();

  return (
    <div className="h-full flex flex-col">
      <Header period={period} onPeriodChange={setPeriod} />

      {/* 차트 컨테이너: 차트 + X축 레이블 */}
      <div className="flex flex-1 min-h-0">
        {/* 차트 영역 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 그래프 */}
          <div
            ref={containerRef}
            className="flex-1 relative min-h-0"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
              setHoveredData(null);
              setTooltipPos(null);
            }}
          >
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-pulse text-gray-400 text-xs">
                  로딩...
                </div>
              </div>
            ) : (
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
              >
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* 눈금선 */}
                <line
                  x1="0"
                  y1="0"
                  x2="100"
                  y2="0"
                  stroke="#f3f4f6"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1="0"
                  y1="50"
                  x2="100"
                  y2="50"
                  stroke="#f3f4f6"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1="0"
                  y1="100"
                  x2="100"
                  y2="100"
                  stroke="#f3f4f6"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
                {/* 영역 */}
                <path d={area} fill="url(#areaGrad)" />
                {/* 라인 */}
                <path
                  d={line}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>

          {/* X축 레이블 - 맨 밑 */}
          <div className="h-4 flex-shrink-0 flex justify-between items-end text-[9px] text-gray-400">
            {!loading && chartData.length > 0 ? (
              <>
                <span>{formatXLabel(chartData[0].date)}</span>
                {chartData.length > 1 && (
                  <span>
                    {formatXLabel(chartData[chartData.length - 1].date)}
                  </span>
                )}
              </>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
        </div>

        {/* Y축 레이블 */}
        <div className="w-10 flex flex-col text-[9px] text-gray-400 text-right pl-1">
          {!loading && chartCalc ? (
            <div className="flex-1 flex flex-col justify-between min-h-0">
              <span>{formatYLabel(chartCalc.max)}</span>
              <span>{formatYLabel(chartCalc.max / 2)}</span>
              <span>$0</span>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <div className="h-4 flex-shrink-0" />
        </div>
      </div>

      {/* 툴팁 */}
      {hoveredData && tooltipPos && (
        <AssetFlowTooltip data={hoveredData} position={tooltipPos} />
      )}
    </div>
  );
}

function Header({
  period,
  onPeriodChange,
}: {
  period: Period;
  onPeriodChange: (p: Period) => void;
}) {
  return (
    <div
      className="flex items-center justify-between mb-3"
      style={{ height: 20 }}
    >
      <span className="text-xs font-medium text-gray-600">자산 흐름</span>
      <div className="flex border rounded overflow-hidden">
        {PERIOD_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={period === opt.value ? "default" : "ghost"}
            size="sm"
            onClick={() => onPeriodChange(opt.value)}
            className={`px-2 py-0.5 text-[10px] h-auto ${
              period === opt.value
                ? "bg-gray-800 text-white hover:bg-gray-800"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
