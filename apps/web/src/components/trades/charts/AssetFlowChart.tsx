"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { formatXLabel } from "@/utils/chart-format";
import { Button } from "@/components/ui/button";
import AssetFlowTooltip from "./AssetFlowTooltip";

interface PnlSnapshot {
  date: string;
  realizedPnl: number;
}

type Period = "1M" | "3M" | "ALL";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "1M", label: "1개월" },
  { value: "3M", label: "3개월" },
  { value: "ALL", label: "전체" },
];

export default function AssetFlowChart() {
  const [period, setPeriod] = useState<Period>("1M");
  const [data, setData] = useState<PnlSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredData, setHoveredData] = useState<PnlSnapshot | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trades/assets?period=${period}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        const pnlData = await res.json();
        setData(pnlData);
      } catch (error) {
        console.error("Failed to fetch PnL flow:", error);
        setError(
          error instanceof Error
            ? error.message
            : "수익 흐름 데이터를 불러오지 못했습니다"
        );
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  const chartCalc = useMemo(() => {
    if (data.length === 0) return null;
    const values = data.map((d) => d.realizedPnl);
    const dataMax = Math.max(...values);
    const dataMin = Math.min(...values);

    // 모든 값이 동일한 경우 처리 (division by zero 방지)
    if (dataMax === dataMin) {
      const value = dataMax;
      const padding = value === 0 ? 1000 : Math.abs(value) * 0.1;
      return { max: value + padding, min: value - padding };
    }

    // 실제 데이터 범위에 맞춰 Y축 설정 (그래프가 바닥에서 시작하도록)
    if (dataMin >= 0) {
      const max = Math.ceil((dataMax * 1.1) / 1000) * 1000;
      // 최소값을 데이터 최소값과 정확히 일치시켜 그래프 시작점과 Y축 눈금 일치
      const min = dataMin;
      return { max, min };
    }

    // 양수와 음수를 모두 포함하도록 범위 설정
    const max =
      Math.ceil((Math.max(dataMax, Math.abs(dataMin)) * 1.1) / 1000) * 1000;
    const min =
      Math.floor((Math.min(dataMin, -Math.abs(dataMax)) * 1.1) / 1000) * 1000;
    return { max, min };
  }, [data]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (data.length === 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (data.length - 1));
    if (index >= 0 && index < data.length) {
      setHoveredData(data[index]);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  // 에러 상태
  if (error && !loading) {
    return (
      <div className="h-full flex flex-col">
        <Header period={period} onPeriodChange={setPeriod} />
        <div className="flex-1 flex items-center justify-center text-red-500 text-xs">
          {error}
        </div>
      </div>
    );
  }

  // 빈 상태
  if (data.length === 0 && !loading) {
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
    if (!chartCalc || data.length === 0) return { line: "", area: "" };

    const w = 100; // percentage
    const h = 100;

    const points = data.map((d, i) => {
      // X 좌표: 0부터 100까지 균등 분배
      const x = data.length > 1 ? (i / (data.length - 1)) * w : 0;
      const y =
        h -
        ((d.realizedPnl - chartCalc.min) / (chartCalc.max - chartCalc.min)) * h;
      return { x, y };
    });

    // line path: 모든 점을 연결
    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    // area path: line을 따라가고, 바닥으로 내려가서 닫기
    // 경로: 첫 번째 점 -> 모든 점 -> 마지막 점 -> 바닥(마지막 x) -> 바닥(첫 번째 x) -> 첫 번째 점
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;

    // area path: 항상 바닥까지 채워지도록 구성
    const area = `${line} L ${lastX} ${h} L ${firstX} ${h} Z`;

    return { line, area };
  };

  const { line, area } = getPath();

  // Y축 눈금선 위치 계산 (viewBox 기준)
  const getGridLineY = (value: number): number => {
    if (!chartCalc) return 0;
    const h = 100;
    return h - ((value - chartCalc.min) / (chartCalc.max - chartCalc.min)) * h;
  };

  const gridLines = chartCalc
    ? [
        { y: getGridLineY(chartCalc.max), value: chartCalc.max },
        {
          y: getGridLineY((chartCalc.max + chartCalc.min) / 2),
          value: (chartCalc.max + chartCalc.min) / 2,
        },
        { y: getGridLineY(chartCalc.min), value: chartCalc.min },
      ]
    : [];

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
                {/* 눈금선 - 데이터 범위에 맞춰 동적으로 계산 */}
                {gridLines.map((grid, idx) => (
                  <line
                    key={idx}
                    x1="0"
                    y1={grid.y}
                    x2="100"
                    y2={grid.y}
                    stroke="#f3f4f6"
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {/* Y축 경계선 (왼쪽) */}
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="100"
                  stroke="#d1d5db"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                {/* X축 경계선 (아래) */}
                <line
                  x1="0"
                  y1="100"
                  x2="100"
                  y2="100"
                  stroke="#d1d5db"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                {/* 영역 */}
                <path d={area} fill="url(#areaGrad)" />
                {/* 라인 - 양수는 초록, 음수는 빨강 */}
                <path
                  d={line}
                  fill="none"
                  stroke={
                    data.length > 0 && data[data.length - 1].realizedPnl >= 0
                      ? "#16a34a"
                      : "#dc2626"
                  }
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
            {!loading && data.length > 0 ? (
              <>
                <span>{formatXLabel(data[0].date)}</span>
                {data.length > 1 && (
                  <span>{formatXLabel(data[data.length - 1].date)}</span>
                )}
              </>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
        </div>

        {/* Y축 레이블 - 차트 영역과 동일한 구조 */}
        <div className="w-6 flex flex-col min-h-0">
          {/* Y축 레이블 - 그래프 영역 높이 */}
          <div className="flex-1 relative min-h-0 text-[9px] text-gray-400 text-right">
            {!loading && chartCalc ? (
              <>
                {/* 모든 레이블을 그래프 영역 내에 배치 */}
                {gridLines.map((grid, idx) => {
                  const value =
                    idx === 0
                      ? chartCalc.max
                      : idx === 1
                        ? (chartCalc.max + chartCalc.min) / 2
                        : chartCalc.min;
                  let labelText: string;
                  if (chartCalc.max >= 1000000) {
                    labelText = `${(value / 1000000).toFixed(1)}M`;
                  } else if (chartCalc.max >= 1000) {
                    // 최소값/최대값은 소수점 표시, 중간값은 반올림하여 깔끔하게
                    if (idx === 0 || idx === gridLines.length - 1) {
                      // 최소값/최대값: 1000의 배수가 아니면 소수점 표시
                      if (value % 1000 === 0) {
                        labelText = `${(value / 1000).toFixed(0)}K`;
                      } else {
                        labelText = `${(value / 1000).toFixed(1)}K`;
                      }
                    } else {
                      // 중간값: 반올림하여 깔끔하게 표시
                      labelText = `${Math.round(value / 1000)}K`;
                    }
                  } else {
                    labelText = value.toFixed(0);
                  }

                  return (
                    <span
                      key={idx}
                      className="absolute right-0"
                      style={{
                        top: `${grid.y}%`,
                        transform: "translateY(-50%)",
                      }}
                    >
                      {labelText}
                    </span>
                  );
                })}
              </>
            ) : null}
          </div>
          {/* X축 레이블과 같은 높이의 하단 영역 */}
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
      <span className="text-xs font-medium text-gray-600">수익 흐름 (PnL)</span>
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
