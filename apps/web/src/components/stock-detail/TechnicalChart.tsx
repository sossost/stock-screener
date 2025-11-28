"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  createChart,
  IChartApi,
  CandlestickData,
  LineData,
  HistogramData,
  Time,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts";
import {
  calculateRSIWithTime,
  calculateMACDWithTime,
  calculateSMA,
  type OHLCData,
} from "@/lib/technical-indicators";

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface HoverData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
  ma20: number | null;
  ma50: number | null;
  ma100: number | null;
  ma200: number | null;
  rsi: number | null;
  macd: number | null;
  signal: number | null;
}

interface TechnicalChartProps {
  symbol: string;
}

// 데이터가 충분하지 않아 1Y 고정
const DEFAULT_PERIOD = "1Y";

// 이동평균선 색상
const MA_COLORS = {
  ma20: "#22c55e", // 초록
  ma50: "#f97316", // 주황
  ma100: "#ec4899", // 분홍
  ma200: "#06b6d4", // 하늘
};

export function TechnicalChart({ symbol }: TechnicalChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  const period = DEFAULT_PERIOD; // 1Y 고정
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverData, setHoverData] = useState<HoverData | null>(null);

  // 모든 날짜별 MA, RSI, MACD 값 미리 계산
  const allIndicatorData = useMemo(() => {
    if (priceData.length === 0) return null;

    const closes = priceData.map((d) => d.close);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const sma100 = calculateSMA(closes, 100);
    const sma200 = calculateSMA(closes, 200);

    const ohlcData: OHLCData[] = priceData.map((d) => ({
      time: d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    const rsiData = calculateRSIWithTime(ohlcData, 14);
    const macdData = calculateMACDWithTime(ohlcData, 12, 26, 9);

    const rsiMap: Record<string, number> = {};
    rsiData.forEach((d) => {
      rsiMap[d.time] = d.value;
    });

    const macdMap: Record<string, { macd: number; signal: number }> = {};
    macdData.forEach((d) => {
      macdMap[d.time] = { macd: d.macd, signal: d.signal };
    });

    const dataMap: Record<
      string,
      {
        ma20: number | null;
        ma50: number | null;
        ma100: number | null;
        ma200: number | null;
        rsi: number | null;
        macd: number | null;
        signal: number | null;
      }
    > = {};

    priceData.forEach((d, i) => {
      dataMap[d.date] = {
        ma20: isNaN(sma20[i]) ? null : sma20[i],
        ma50: isNaN(sma50[i]) ? null : sma50[i],
        ma100: isNaN(sma100[i]) ? null : sma100[i],
        ma200: isNaN(sma200[i]) ? null : sma200[i],
        rsi: rsiMap[d.date] ?? null,
        macd: macdMap[d.date]?.macd ?? null,
        signal: macdMap[d.date]?.signal ?? null,
      };
    });

    return dataMap;
  }, [priceData]);

  // 마지막(최신) 데이터
  const latestData = useMemo((): HoverData | null => {
    if (priceData.length === 0 || !allIndicatorData) return null;

    const last = priceData[priceData.length - 1];
    const prev = priceData.length > 1 ? priceData[priceData.length - 2] : last;
    const change = last.close - prev.close;
    const changePercent = (change / prev.close) * 100;
    const maData = allIndicatorData[last.date];

    return {
      date: last.date,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      volume: last.volume,
      change,
      changePercent,
      ...maData,
    };
  }, [priceData, allIndicatorData]);

  // 표시할 데이터 (호버 시 해당 날짜, 아니면 최신)
  const displayData = hoverData || latestData;

  // 데이터 fetch
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stock/${symbol}/prices?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setPriceData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [symbol, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 차트 생성 및 업데이트
  useEffect(() => {
    if (
      !chartContainerRef.current ||
      !rsiContainerRef.current ||
      !macdContainerRef.current ||
      priceData.length === 0 ||
      !allIndicatorData
    )
      return;

    const chartWidth = chartContainerRef.current.clientWidth;

    const baseOptions = {
      width: chartWidth,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#374151",
      },
      grid: {
        vertLines: { color: "#f3f4f6" },
        horzLines: { color: "#f3f4f6" },
      },
      crosshair: { mode: 1 as const },
      handleScroll: false,
      handleScale: false,
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        minimumWidth: 50,
      },
      timeScale: {
        borderVisible: false,
        visible: false,
      },
    };

    // 메인 차트
    const mainChart = createChart(chartContainerRef.current, {
      ...baseOptions,
      height: 350,
    });
    mainChartRef.current = mainChart;

    // 캔들스틱 시리즈 (v5 API)
    const candlestickSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
    });

    const candleData: CandlestickData<Time>[] = priceData.map((d) => ({
      time: d.date as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    candlestickSeries.setData(candleData);

    // 거래량 시리즈
    const volumeSeries = mainChart.addSeries(HistogramSeries, {
      color: "#3b82f6",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      lastValueVisible: false,
      priceLineVisible: false,
    });

    mainChart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const volumeData: HistogramData<Time>[] = priceData.map((d) => ({
      time: d.date as Time,
      value: d.volume,
      color: d.close >= d.open ? "#22c55e40" : "#ef444440",
    }));
    volumeSeries.setData(volumeData);

    // 이동평균선 (클라이언트에서 직접 계산 - DB 백필 불필요)
    const closes = priceData.map((d) => d.close);

    const addMASeries = (period: number, color: string) => {
      const maSeries = mainChart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      const smaValues = calculateSMA(closes, period);
      const maData: LineData<Time>[] = priceData
        .map((d, i) => ({
          time: d.date as Time,
          value: smaValues[i],
        }))
        .filter((d) => !isNaN(d.value));

      maSeries.setData(maData);
      return maSeries;
    };

    addMASeries(20, MA_COLORS.ma20);
    addMASeries(50, MA_COLORS.ma50);
    addMASeries(100, MA_COLORS.ma100);
    addMASeries(200, MA_COLORS.ma200);

    // 크로스헤어 이벤트 구독 (호버 데이터 업데이트)
    mainChart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setHoverData(null);
        return;
      }

      const dateStr = param.time as string;
      const priceItem = priceData.find((d) => d.date === dateStr);
      const prevIdx = priceData.findIndex((d) => d.date === dateStr) - 1;
      const prevItem = prevIdx >= 0 ? priceData[prevIdx] : priceItem;

      if (priceItem && prevItem && allIndicatorData[dateStr]) {
        const change = priceItem.close - prevItem.close;
        const changePercent = (change / prevItem.close) * 100;

        setHoverData({
          date: priceItem.date,
          open: priceItem.open,
          high: priceItem.high,
          low: priceItem.low,
          close: priceItem.close,
          volume: priceItem.volume,
          change,
          changePercent,
          ...allIndicatorData[dateStr],
        });
      }
    });

    // RSI 차트 - 30, 70만 표시
    const rsiChart = createChart(rsiContainerRef.current, {
      ...baseOptions,
      height: 80,
      rightPriceScale: {
        borderVisible: false,
        minimumWidth: 50,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      localization: {
        priceFormatter: (price: number) => {
          if (Math.abs(price - 30) < 5 || Math.abs(price - 70) < 5) {
            return Math.round(price).toString();
          }
          return "";
        },
      },
    });
    rsiChartRef.current = rsiChart;

    const rsiSeries = rsiChart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
      autoscaleInfoProvider: () => ({
        priceRange: { minValue: 0, maxValue: 100 },
      }),
    });

    // RSI 기준선 (30, 70) - 배경 흰색
    rsiSeries.createPriceLine({
      price: 70,
      color: "#e5e7eb",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      axisLabelColor: "#ffffff",
      axisLabelTextColor: "#374151",
    });
    rsiSeries.createPriceLine({
      price: 30,
      color: "#e5e7eb",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      axisLabelColor: "#ffffff",
      axisLabelTextColor: "#374151",
    });

    const ohlcData: OHLCData[] = priceData.map((d) => ({
      time: d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const rsiData = calculateRSIWithTime(ohlcData, 14);
    const rsiLineData: LineData<Time>[] = rsiData.map((d) => ({
      time: d.time as Time,
      value: d.value,
    }));
    rsiSeries.setData(rsiLineData);

    // MACD 차트 - 시간축 표시
    const macdChart = createChart(macdContainerRef.current, {
      ...baseOptions,
      height: 100,
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
        minimumWidth: 50,
      },
      timeScale: {
        borderVisible: false,
        visible: true,
        timeVisible: false,
      },
    });
    macdChartRef.current = macdChart;

    const macdData = calculateMACDWithTime(ohlcData, 12, 26, 9);

    // MACD 히스토그램
    const histogramSeries = macdChart.addSeries(HistogramSeries, {
      color: "#3b82f6",
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
    });

    const histogramData: HistogramData<Time>[] = macdData.map((d) => ({
      time: d.time as Time,
      value: d.histogram,
      color: d.histogram >= 0 ? "#22c55e" : "#ef4444",
    }));
    histogramSeries.setData(histogramData);

    // MACD Line
    const macdLineSeries = macdChart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const macdLineData: LineData<Time>[] = macdData.map((d) => ({
      time: d.time as Time,
      value: d.macd,
    }));
    macdLineSeries.setData(macdLineData);

    // Signal Line
    const signalSeries = macdChart.addSeries(LineSeries, {
      color: "#f97316",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const signalData: LineData<Time>[] = macdData.map((d) => ({
      time: d.time as Time,
      value: d.signal,
    }));
    signalSeries.setData(signalData);

    // 차트 동기화
    mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) {
        rsiChart.timeScale().setVisibleLogicalRange(range);
        macdChart.timeScale().setVisibleLogicalRange(range);
      }
    });

    rsiChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) {
        mainChart.timeScale().setVisibleLogicalRange(range);
        macdChart.timeScale().setVisibleLogicalRange(range);
      }
    });

    macdChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) {
        mainChart.timeScale().setVisibleLogicalRange(range);
        rsiChart.timeScale().setVisibleLogicalRange(range);
      }
    });

    // 반응형 리사이즈 - 모든 차트 동일 너비
    const handleResize = () => {
      if (chartContainerRef.current) {
        const newWidth = chartContainerRef.current.clientWidth;
        mainChart.applyOptions({ width: newWidth });
        rsiChart.applyOptions({ width: newWidth });
        macdChart.applyOptions({ width: newWidth });
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    // Cleanup: 이벤트 리스너 및 차트 제거
    return () => {
      window.removeEventListener("resize", handleResize);
      // 차트 제거 (메모리 누수 방지)
      mainChart.remove();
      rsiChart.remove();
      macdChart.remove();
      mainChartRef.current = null;
      rsiChartRef.current = null;
      macdChartRef.current = null;
    };
  }, [priceData, allIndicatorData]);

  // 숫자 포맷
  const formatPrice = (value: number | null) => {
    if (value === null) return "-";
    return value.toFixed(2);
  };

  const formatVolume = (value: number) => {
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + "B";
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + "M";
    if (value >= 1_000) return (value / 1_000).toFixed(2) + "K";
    return value.toFixed(0);
  };

  const formatChange = (value: number, percent: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-48" />
          <div className="h-[400px] bg-gray-100 rounded" />
          <div className="h-[100px] bg-gray-100 rounded" />
          <div className="h-[100px] bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 text-center text-red-500 shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* 메인 차트 */}
      <div className="relative">
        {/* 차트 왼쪽 상단: 정보 패널 */}
        {displayData && (
          <div className="absolute left-2 top-2 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 text-xs">
            {/* 날짜 + OHLC */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="font-semibold text-gray-800 mb-1">
                {displayData.date}
              </div>
              <div className="grid grid-cols-4 gap-x-4 gap-y-0.5 text-gray-600">
                <span>
                  O{" "}
                  <span className="font-medium text-gray-900">
                    {formatPrice(displayData.open)}
                  </span>
                </span>
                <span>
                  H{" "}
                  <span className="font-medium text-gray-900">
                    {formatPrice(displayData.high)}
                  </span>
                </span>
                <span>
                  L{" "}
                  <span className="font-medium text-gray-900">
                    {formatPrice(displayData.low)}
                  </span>
                </span>
                <span>
                  C{" "}
                  <span className="font-medium text-gray-900">
                    {formatPrice(displayData.close)}
                  </span>
                </span>
              </div>
            </div>

            {/* 변동 + 거래량 */}
            <div className="px-3 py-2 border-b border-gray-100 flex gap-4">
              <span
                className={`font-medium ${
                  displayData.change >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatChange(displayData.change, displayData.changePercent)}
              </span>
              <span className="text-gray-500">
                Vol{" "}
                <span className="font-medium text-gray-700">
                  {formatVolume(displayData.volume)}
                </span>
              </span>
            </div>

            {/* 이동평균선 */}
            <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span style={{ color: MA_COLORS.ma20 }} className="font-medium">
                MA20 {formatPrice(displayData.ma20)}
              </span>
              <span style={{ color: MA_COLORS.ma50 }} className="font-medium">
                MA50 {formatPrice(displayData.ma50)}
              </span>
              <span style={{ color: MA_COLORS.ma100 }} className="font-medium">
                MA100 {formatPrice(displayData.ma100)}
              </span>
              <span style={{ color: MA_COLORS.ma200 }} className="font-medium">
                MA200 {formatPrice(displayData.ma200)}
              </span>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} />
      </div>

      {/* RSI */}
      <div className="relative mt-1">
        <span className="absolute left-2 top-1 text-xs text-gray-500 z-10">
          RSI (14){" "}
          {displayData?.rsi !== null && (
            <span className="text-purple-500 font-medium">
              {displayData?.rsi?.toFixed(0)}
            </span>
          )}
        </span>
        <div ref={rsiContainerRef} />
      </div>

      {/* MACD */}
      <div className="relative mt-1">
        <span className="absolute left-2 top-1 text-xs text-gray-500 z-10">
          MACD (12, 26, 9){" "}
          {displayData?.macd !== null && (
            <>
              <span className="text-blue-500 font-medium">
                {displayData?.macd?.toFixed(2)}
              </span>
              {" / "}
              <span className="text-orange-500 font-medium">
                {displayData?.signal?.toFixed(2)}
              </span>
            </>
          )}
        </span>
        <div ref={macdContainerRef} />
      </div>
    </div>
  );
}
