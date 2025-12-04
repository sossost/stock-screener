"use client";

import React from "react";
import {
  getMAFilterSummary,
  getGrowthFilterSummary,
  getProfitabilityFilterSummary,
  getPriceFilterSummary,
  type FilterState,
  type FilterCategory,
} from "@/lib/filters/summary";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, BarChart3, Zap } from "lucide-react";

interface CategoryFilterBoxProps {
  category: FilterCategory;
  filterState: FilterState;
  onClick: () => void;
  disabled?: boolean;
}

const categoryConfig = {
  ma: {
    label: "이평선",
    icon: TrendingUp,
    getSummary: getMAFilterSummary,
  },
  growth: {
    label: "성장성",
    icon: BarChart3,
    getSummary: getGrowthFilterSummary,
  },
  profitability: {
    label: "수익성",
    icon: DollarSign,
    getSummary: getProfitabilityFilterSummary,
  },
  price: {
    label: "가격",
    icon: Zap,
    getSummary: getPriceFilterSummary,
  },
};

export function CategoryFilterBox({
  category,
  filterState,
  onClick,
  disabled,
}: CategoryFilterBoxProps) {
  const config = categoryConfig[category];
  const Icon = config.icon;
  const summary = config.getSummary(filterState);

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="h-12 px-4 py-2.5 bg-card rounded-lg border shadow-sm hover:bg-accent/50 transition-colors font-semibold gap-2 flex-shrink-0"
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
        <span className="text-sm font-medium leading-none">{config.label}</span>
        <span className="text-xs text-muted-foreground leading-none truncate max-w-[200px]">
          {summary.count > 0 ? summary.summaryText : "없음"}
        </span>
      </div>
      {summary.count > 0 && (
        <span className="flex-shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {summary.count}
        </span>
      )}
    </Button>
  );
}
