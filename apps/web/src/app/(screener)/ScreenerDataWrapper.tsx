"use client";

import React, { useEffect } from "react";
import { useScreenerData } from "@/hooks/useScreenerData";
import type { FilterState } from "@/lib/filters/summary";
import type { ScreenerCompany } from "@/types/screener";
import { StockTable } from "@/components/screener/StockTable";
import { TableSkeleton } from "./TableSkeleton";
import { StateMessage } from "@/components/common/StateMessage";

type ScreenerClientProps = {
  filterState: FilterState;
  filteredData: ScreenerCompany[];
  tickerSearch: string;
  isSearching: boolean;
  onDataLoad: (data: ScreenerCompany[]) => void;
};

/**
 * 필터를 받아서 데이터를 페칭하고 렌더링하는 컴포넌트
 */
export function ScreenerDataWrapper({
  filterState,
  filteredData,
  tickerSearch,
  isSearching,
  onDataLoad,
}: ScreenerClientProps) {
  // 데이터 페칭 (useSuspenseQuery 사용)
  const screenerData = useScreenerData();

  // 데이터 로드 시 상위 컴포넌트에 전달 (티커 검색용)
  useEffect(() => {
    if (screenerData.data.length > 0) {
      onDataLoad(screenerData.data);
    }
  }, [screenerData.data, onDataLoad]);

  if (screenerData.error) {
    return (
      <StateMessage
        variant="error"
        title="데이터를 불러오지 못했습니다"
        description={screenerData.error}
      />
    );
  }

  // 데이터 로드 중이거나 데이터가 없으면 스켈레톤 표시
  if (screenerData.data.length === 0 && !screenerData.error) {
    return <TableSkeleton />;
  }

  const hasDataLoaded = screenerData.data.length > 0;

  // filteredData가 비어있지만 아직 상위 컴포넌트에 데이터가 전달되지 않았을 수 있음
  // screenerData.data.length > 0이지만 filteredData.length === 0이면
  // 아직 티커 검색이 적용되지 않은 상태일 수 있으므로 원본 데이터를 표시
  // 또는 실제로 필터링 결과가 없는 상태
  if (hasDataLoaded && filteredData.length === 0) {
    // tickerSearch가 비어있으면 티커 검색이 적용되지 않은 것이므로 원본 데이터 표시
    if (tickerSearch.length === 0) {
      return (
        <StockTable
          data={screenerData.data}
          filterState={filterState}
          tickerSearch={tickerSearch}
          tradeDate={screenerData.trade_date}
          totalCount={screenerData.data.length}
        />
      );
    }
    // tickerSearch가 있지만 filteredData가 비어있고 검색 중이 아니면 실제로 필터링 결과가 없는 것
    if (!isSearching) {
      return (
        <StateMessage
          title="표시할 데이터가 없습니다"
          description="필터 조건을 완화하거나 다른 티커를 검색해 보세요."
        />
      );
    }
  }

  return (
    <StockTable
      data={filteredData}
      filterState={filterState}
      tickerSearch={tickerSearch}
      tradeDate={screenerData.trade_date}
      totalCount={screenerData.data.length}
    />
  );
}
