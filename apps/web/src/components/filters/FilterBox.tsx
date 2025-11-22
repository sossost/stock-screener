"use client";

import React from "react";
import { getFilterSummary, type FilterState } from "@/lib/filter-summary";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

interface FilterBoxProps {
  filterState: FilterState;
  onClick: () => void;
  disabled?: boolean;
}

export function FilterBox({ filterState, onClick, disabled }: FilterBoxProps) {
  const summary = getFilterSummary(filterState);

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="h-12 px-4 py-2.5 bg-card rounded-lg border shadow-sm hover:bg-accent/50 transition-colors font-semibold justify-start gap-2"
    >
      <Filter className="h-4 w-4" />
      <span className="text-sm">
        {summary.count > 0 ? summary.summaryText : "필터 없음"}
      </span>
      {summary.count > 0 && (
        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {summary.count}
        </span>
      )}
    </Button>
  );
}

