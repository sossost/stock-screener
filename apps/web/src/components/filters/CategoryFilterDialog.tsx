"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { GrowthFilterControls } from "./GrowthFilterControls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterState, FilterCategory } from "@/lib/filter-summary";

interface CategoryFilterDialogProps {
  category: FilterCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterState: FilterState;
  onApply: (newState: Partial<FilterState>) => void;
  onReset: () => void;
  disabled?: boolean;
}

const categoryLabels = {
  ma: "이평선 필터",
  growth: "성장성 필터",
  profitability: "수익성 필터",
};

export function CategoryFilterDialog({
  category,
  open,
  onOpenChange,
  filterState,
  onApply,
  onReset,
  disabled,
}: CategoryFilterDialogProps) {
  // 카테고리별 초기 상태 계산 (useMemo로 최적화)
  const initialTempState = React.useMemo(() => {
    if (category === "ma") {
      return {
        ordered: filterState.ordered ?? true,
        goldenCross: filterState.goldenCross ?? true,
        justTurned: filterState.justTurned ?? false,
        lookbackDays: filterState.lookbackDays ?? 10,
      };
    } else if (category === "growth") {
      return {
        revenueGrowth: filterState.revenueGrowth ?? false,
        revenueGrowthQuarters: filterState.revenueGrowthQuarters ?? 3,
        revenueGrowthRate: filterState.revenueGrowthRate ?? null,
        incomeGrowth: filterState.incomeGrowth ?? false,
        incomeGrowthQuarters: filterState.incomeGrowthQuarters ?? 3,
        incomeGrowthRate: filterState.incomeGrowthRate ?? null,
        pegFilter: filterState.pegFilter ?? false,
      };
    } else if (category === "profitability") {
      return {
        profitability: filterState.profitability ?? "all",
        turnAround: filterState.turnAround ?? false,
      };
    }
    return {};
  }, [category, filterState]);

  // 팝업 내부에서만 사용하는 임시 상태
  const [tempState, setTempState] =
    useState<Partial<FilterState>>(initialTempState);
  const [inputValue, setInputValue] = useState(
    filterState.lookbackDays?.toString() || "10"
  );

  // 팝업이 열릴 때마다 현재 필터 상태로 초기화
  useEffect(() => {
    if (open) {
      setTempState(initialTempState);
      if (category === "ma") {
        setInputValue(filterState.lookbackDays?.toString() || "10");
      }
    }
  }, [open, initialTempState, category, filterState.lookbackDays]);

  const handleApply = () => {
    if (category === "ma") {
      const lookbackDays = Number(inputValue);
      if (lookbackDays >= 1 && lookbackDays <= 60) {
        onApply({
          ...tempState,
          lookbackDays,
        });
      }
    } else {
      onApply(tempState);
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleReset = () => {
    if (category === "ma") {
      setTempState({
        ordered: true,
        goldenCross: true,
        justTurned: false,
        lookbackDays: 10,
      });
      setInputValue("10");
    } else if (category === "growth") {
      setTempState({
        revenueGrowth: false,
        revenueGrowthQuarters: 3,
        revenueGrowthRate: null,
        incomeGrowth: false,
        incomeGrowthQuarters: 3,
        incomeGrowthRate: null,
        pegFilter: false,
      });
    } else if (category === "profitability") {
      setTempState({
        profitability: "all",
        turnAround: false,
      });
    }
    onReset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>{categoryLabels[category]}</DialogTitle>
          <DialogDescription>
            원하는 조건을 선택하여 종목을 필터링하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 이평선 필터 섹션 */}
          {category === "ma" && (
            <div className="space-y-4">
              {/* 정배열 필터 */}
              <div className="bg-card rounded-lg px-4 py-2.5 border shadow-sm hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-2 h-10">
                  <Checkbox
                    id="ordered"
                    checked={tempState.ordered ?? true}
                    onCheckedChange={(checked) =>
                      setTempState({ ...tempState, ordered: checked === true })
                    }
                    disabled={disabled}
                  />
                  <label
                    htmlFor="ordered"
                    className="text-sm font-semibold leading-none cursor-pointer select-none whitespace-nowrap"
                  >
                    정배열
                  </label>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    (MA20 {">"} MA50 {">"} MA100 {">"} MA200)
                  </span>
                </div>

                {/* 최근 전환 옵션 (정배열 필터가 활성화된 경우에만 표시) */}
                {tempState.ordered && (
                  <>
                    <div className="h-px bg-border my-0.5 ml-[26px]" />
                    <div className="flex items-center gap-2 h-10">
                      <div className="w-[18px] flex-shrink-0" />
                      <label
                        htmlFor="just-turned-toggle"
                        className="text-sm font-semibold leading-none cursor-pointer whitespace-nowrap"
                      >
                        최근 전환
                      </label>
                      <Switch
                        id="just-turned-toggle"
                        checked={tempState.justTurned ?? false}
                        onCheckedChange={(checked) =>
                          setTempState({ ...tempState, justTurned: checked })
                        }
                        disabled={disabled}
                      />
                      {tempState.justTurned && (
                        <>
                          <div className="w-px h-4 bg-border mx-1" />
                          <label
                            htmlFor="lookback-days"
                            className="text-xs text-muted-foreground font-medium"
                          >
                            기간:
                          </label>
                          <input
                            type="number"
                            id="lookback-days"
                            min="1"
                            max="60"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={disabled}
                            className="w-16 px-2 py-1 text-xs border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                          />
                          <span className="text-xs text-muted-foreground">
                            일
                          </span>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* 골든크로스 필터 */}
              <div className="bg-card rounded-lg px-4 py-2.5 border shadow-sm hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-2 h-10">
                  <Checkbox
                    id="goldenCross"
                    checked={tempState.goldenCross ?? true}
                    onCheckedChange={(checked) =>
                      setTempState({
                        ...tempState,
                        goldenCross: checked === true,
                      })
                    }
                    disabled={disabled}
                  />
                  <label
                    htmlFor="goldenCross"
                    className="text-sm font-semibold leading-none cursor-pointer select-none"
                  >
                    골든크로스
                  </label>
                  <span className="text-xs text-muted-foreground">
                    (MA50 {">"} MA200)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 성장성 필터 섹션 */}
          {category === "growth" && (
            <div className="space-y-4">
              <GrowthFilterControls
                revenueGrowth={tempState.revenueGrowth ?? false}
                setRevenueGrowth={(value) =>
                  setTempState({ ...tempState, revenueGrowth: value })
                }
                revenueGrowthQuarters={tempState.revenueGrowthQuarters ?? 3}
                setRevenueGrowthQuarters={(value) =>
                  setTempState({ ...tempState, revenueGrowthQuarters: value })
                }
                revenueGrowthRate={tempState.revenueGrowthRate ?? null}
                setRevenueGrowthRate={(value) =>
                  setTempState({ ...tempState, revenueGrowthRate: value })
                }
                incomeGrowth={tempState.incomeGrowth ?? false}
                setIncomeGrowth={(value) =>
                  setTempState({ ...tempState, incomeGrowth: value })
                }
                incomeGrowthQuarters={tempState.incomeGrowthQuarters ?? 3}
                setIncomeGrowthQuarters={(value) =>
                  setTempState({ ...tempState, incomeGrowthQuarters: value })
                }
                incomeGrowthRate={tempState.incomeGrowthRate ?? null}
                setIncomeGrowthRate={(value) =>
                  setTempState({ ...tempState, incomeGrowthRate: value })
                }
                pegFilter={tempState.pegFilter ?? false}
                setPegFilter={(value) =>
                  setTempState({ ...tempState, pegFilter: value })
                }
              />
            </div>
          )}

          {/* 수익성 필터 섹션 */}
          {category === "profitability" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-card rounded-lg px-4 py-2.5 border shadow-sm hover:bg-accent/50 transition-colors h-12">
                <label className="text-sm font-semibold leading-none">
                  수익성
                </label>
                <Select
                  value={tempState.profitability ?? "all"}
                  onValueChange={(value: string) =>
                    setTempState({
                      ...tempState,
                      profitability: value as
                        | "all"
                        | "profitable"
                        | "unprofitable",
                    })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="w-[80px] h-8 text-sm border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[80px]">
                    <SelectItem value="all" className="cursor-pointer text-sm">
                      전체
                    </SelectItem>
                    <SelectItem
                      value="profitable"
                      className="cursor-pointer text-sm"
                    >
                      흑자
                    </SelectItem>
                    <SelectItem
                      value="unprofitable"
                      className="cursor-pointer text-sm"
                    >
                      적자
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-card rounded-lg px-4 py-3 border shadow-sm hover:bg-accent/50 transition-colors space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="turnaround-toggle"
                    checked={tempState.turnAround ?? false}
                    onCheckedChange={(checked) =>
                      setTempState({
                        ...tempState,
                        turnAround: checked === true,
                      })
                    }
                    disabled={disabled}
                  />
                  <label
                    htmlFor="turnaround-toggle"
                    className="text-sm font-semibold leading-none cursor-pointer"
                  >
                    최근 분기 흑자 전환
                  </label>
                </div>
                <p className="text-xs text-muted-foreground leading-snug max-w-[420px] pl-6">
                  가장 최근 EPS가 양수이고 직전 분기 EPS가 0 이하인 기업만 보여줍니다.
                  EPS 데이터가 2분기 이상 없으면 제외됩니다.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={disabled}
            className="mr-auto"
          >
            초기화
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={disabled}
            >
              취소
            </Button>
            <Button onClick={handleApply} disabled={disabled}>
              적용
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
