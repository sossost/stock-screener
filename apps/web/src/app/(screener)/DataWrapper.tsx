"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import ScreenerClient from "./ScreenerClient";
import { API_BASE_URL } from "@/lib/config/constants";
import {
  parseFilters,
  buildQueryParams,
  type ParsedFilters,
} from "@/lib/filters/schema";
import { loadDefaultFilters } from "@/utils/filter-storage";
import { useQueryState } from "nuqs";
import { parseAsBoolean, parseAsInteger, parseAsStringLiteral } from "nuqs";
import { profitabilityValues } from "@/lib/filters/schema";
import type { ScreenerCompany } from "@/types/screener";

type ScreenerData = {
  data: ScreenerCompany[];
  trade_date: string | null;
  error?: string | null;
};

async function fetchScreenerData(params: URLSearchParams): Promise<ScreenerData> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/screener/stocks?${params.toString()}`,
      {
        cache: "no-store", // 클라이언트 사이드에서는 캐싱 없이
      }
    );

    if (!response.ok) {
      return {
        data: [],
        trade_date: null,
        error: `데이터를 불러오지 못했습니다 (status ${response.status})`,
      };
    }

    return response.json();
  } catch {
    return {
      data: [],
      trade_date: null,
      error: "데이터를 불러오지 못했습니다. 네트워크 상태를 확인해 주세요.",
    };
  }
}

export function DataWrapper() {
  const searchParamsObj = useSearchParams();
  const [data, setData] = useState<ScreenerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  // nuqs 훅들 (URL 업데이트용)
  const [ordered, setOrdered] = useQueryState("ordered", parseAsBoolean);
  const [goldenCross, setGoldenCross] = useQueryState("goldenCross", parseAsBoolean);
  const [justTurned, setJustTurned] = useQueryState("justTurned", parseAsBoolean);
  const [lookbackDays, setLookbackDays] = useQueryState("lookbackDays", parseAsInteger);
  const [profitability, setProfitability] = useQueryState(
    "profitability",
    parseAsStringLiteral(
      profitabilityValues as Array<"all" | "profitable" | "unprofitable">
    )
  );
  const [turnAround, setTurnAround] = useQueryState("turnAround", parseAsBoolean);
  const [revenueGrowth, setRevenueGrowth] = useQueryState("revenueGrowth", parseAsBoolean);
  const [incomeGrowth, setIncomeGrowth] = useQueryState("incomeGrowth", parseAsBoolean);
  const [revenueGrowthQuarters, setRevenueGrowthQuarters] = useQueryState(
    "revenueGrowthQuarters",
    parseAsInteger
  );
  const [incomeGrowthQuarters, setIncomeGrowthQuarters] = useQueryState(
    "incomeGrowthQuarters",
    parseAsInteger
  );
  const [revenueGrowthRate, setRevenueGrowthRate] = useQueryState(
    "revenueGrowthRate",
    parseAsInteger
  );
  const [incomeGrowthRate, setIncomeGrowthRate] = useQueryState(
    "incomeGrowthRate",
    parseAsInteger
  );
  const [pegFilter, setPegFilter] = useQueryState("pegFilter", parseAsBoolean);
  const [ma20Above, setMa20Above] = useQueryState("ma20Above", parseAsBoolean);
  const [ma50Above, setMa50Above] = useQueryState("ma50Above", parseAsBoolean);
  const [ma100Above, setMa100Above] = useQueryState("ma100Above", parseAsBoolean);
  const [ma200Above, setMa200Above] = useQueryState("ma200Above", parseAsBoolean);

  // 초기 필터 로드 및 데이터 페칭
  // 초기화는 마운트 시 한 번만 실행되어야 하므로 빈 배열 사용
  // searchParamsObj와 setter 함수들은 안정적이므로 의존성에 포함하지 않음
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeFilters = async () => {
      // URL에 필터 파라미터가 있는지 확인
      const hasUrlFilters = searchParamsObj.toString().length > 0;

      let filtersToUse: ParsedFilters;

      // URL에 필터가 없으면 localStorage에서 로드
      if (!hasUrlFilters) {
        const savedFilters = loadDefaultFilters();
        if (savedFilters) {
          // localStorage 필터를 문자열로 변환해서 parseFilters에 전달
          const savedFiltersAsStrings: Record<string, string> = {};
          Object.entries(savedFilters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              savedFiltersAsStrings[key] = String(value);
            }
          });
          filtersToUse = parseFilters(savedFiltersAsStrings);
          
          // 동시에 URL에도 적용 (비동기로 처리, 데이터 페칭은 기다리지 않음)
          const updatePromises: Promise<URLSearchParams>[] = [];
          if (savedFilters.ordered !== undefined) updatePromises.push(setOrdered(savedFilters.ordered));
          if (savedFilters.goldenCross !== undefined) updatePromises.push(setGoldenCross(savedFilters.goldenCross));
          if (savedFilters.justTurned !== undefined) updatePromises.push(setJustTurned(savedFilters.justTurned));
          if (savedFilters.lookbackDays !== undefined) updatePromises.push(setLookbackDays(savedFilters.lookbackDays));
          if (savedFilters.profitability !== undefined) updatePromises.push(setProfitability(savedFilters.profitability));
          if (savedFilters.turnAround !== undefined) updatePromises.push(setTurnAround(savedFilters.turnAround));
          if (savedFilters.revenueGrowth !== undefined) updatePromises.push(setRevenueGrowth(savedFilters.revenueGrowth));
          if (savedFilters.incomeGrowth !== undefined) updatePromises.push(setIncomeGrowth(savedFilters.incomeGrowth));
          if (savedFilters.revenueGrowthQuarters !== undefined) updatePromises.push(setRevenueGrowthQuarters(savedFilters.revenueGrowthQuarters));
          if (savedFilters.incomeGrowthQuarters !== undefined) updatePromises.push(setIncomeGrowthQuarters(savedFilters.incomeGrowthQuarters));
          if (savedFilters.revenueGrowthRate !== undefined) updatePromises.push(setRevenueGrowthRate(savedFilters.revenueGrowthRate));
          if (savedFilters.incomeGrowthRate !== undefined) updatePromises.push(setIncomeGrowthRate(savedFilters.incomeGrowthRate));
          if (savedFilters.pegFilter !== undefined) updatePromises.push(setPegFilter(savedFilters.pegFilter));
          if (savedFilters.ma20Above !== undefined) updatePromises.push(setMa20Above(savedFilters.ma20Above));
          if (savedFilters.ma50Above !== undefined) updatePromises.push(setMa50Above(savedFilters.ma50Above));
          if (savedFilters.ma100Above !== undefined) updatePromises.push(setMa100Above(savedFilters.ma100Above));
          if (savedFilters.ma200Above !== undefined) updatePromises.push(setMa200Above(savedFilters.ma200Above));
          Promise.all(updatePromises).catch(console.error); // 에러만 로그, 기다리지 않음
        } else {
          // localStorage에도 없으면 현재 URL 파라미터 사용
          const currentParams = new URLSearchParams(window.location.search);
          filtersToUse = parseFilters(currentParams);
        }
      } else {
        // URL에 필터가 있으면 URL 파라미터 사용
        const currentParams = new URLSearchParams(window.location.search);
        filtersToUse = parseFilters(currentParams);
      }

      // 필터를 사용해서 데이터 페칭
      const params = buildQueryParams(filtersToUse);
      
      setIsLoading(true);
      try {
        const result = await fetchScreenerData(params);
        setData(result);
      } catch (error) {
        console.error("필터 초기화 중 데이터 페칭 실패:", error);
        setData({
          data: [],
          trade_date: null,
          error: "데이터를 불러오는 중 오류가 발생했습니다.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL 파라미터 변경 시 데이터 다시 페칭
  useEffect(() => {
    if (!hasInitialized.current) return; // 초기 로드는 위에서 처리

    const fetchData = async () => {
      try {
        const currentParams = new URLSearchParams(window.location.search);
        const filters = parseFilters(currentParams);
        const params = buildQueryParams(filters);
        
        setIsLoading(true);
        const result = await fetchScreenerData(params);
        setData(result);
      } catch (error) {
        console.error("URL 파라미터 변경 시 데이터 페칭 실패:", error);
        setData({
          data: [],
          trade_date: null,
          error: "데이터를 불러오는 중 오류가 발생했습니다.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    ordered,
    goldenCross,
    justTurned,
    lookbackDays,
    profitability,
    turnAround,
    revenueGrowth,
    incomeGrowth,
    revenueGrowthQuarters,
    incomeGrowthQuarters,
    revenueGrowthRate,
    incomeGrowthRate,
    pegFilter,
    ma20Above,
    ma50Above,
    ma100Above,
    ma200Above,
  ]);

  return (
    <ScreenerClient
      data={isLoading || !data ? [] : data.data || []}
      tradeDate={data?.trade_date || null}
      error={data?.error || null}
    />
  );
}
