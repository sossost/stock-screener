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
import type { FilterState, FilterCategory } from "@/lib/filters/summary";
import { profitabilityOptions } from "@/lib/filters/schema";
import { FILTER_DEFAULTS } from "@/lib/filters/constants";

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
  price: "가격필터",
  noise: "노이즈 필터",
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
  // 카테고리별 초기 상태 계산 (useMemo로 최적화 - open이 true일 때만 계산)
  const initialTempState = React.useMemo(() => {
    if (!open) return {};

    if (category === "ma") {
      return {
        // 이평선 필터는 URL 파라미터에 명시적으로 값이 있어야만 적용되므로
        // null/undefined일 때는 false로 설정 (체크 해제 상태)
        ordered: filterState.ordered ?? false,
        goldenCross: filterState.goldenCross ?? false,
        justTurned: filterState.justTurned ?? false,
        lookbackDays: filterState.lookbackDays ?? FILTER_DEFAULTS.LOOKBACK_DAYS,
        ma20Above: filterState.ma20Above ?? false,
        ma50Above: filterState.ma50Above ?? false,
        ma100Above: filterState.ma100Above ?? false,
        ma200Above: filterState.ma200Above ?? false,
      };
    } else if (category === "growth") {
      return {
        revenueGrowth: filterState.revenueGrowth ?? false,
        revenueGrowthQuarters:
          filterState.revenueGrowthQuarters ??
          FILTER_DEFAULTS.REVENUE_GROWTH_QUARTERS,
        revenueGrowthRate: filterState.revenueGrowthRate ?? null,
        incomeGrowth: filterState.incomeGrowth ?? false,
        incomeGrowthQuarters:
          filterState.incomeGrowthQuarters ??
          FILTER_DEFAULTS.INCOME_GROWTH_QUARTERS,
        incomeGrowthRate: filterState.incomeGrowthRate ?? null,
        pegFilter: filterState.pegFilter ?? false,
      };
    } else if (category === "profitability") {
      return {
        profitability: filterState.profitability ?? "all",
        turnAround: filterState.turnAround ?? false,
      };
    } else if (category === "price") {
      return {
        breakoutStrategy: filterState.breakoutStrategy ?? null,
      };
    } else if (category === "noise") {
      return {
        volumeFilter: filterState.volumeFilter ?? false,
        vcpFilter: filterState.vcpFilter ?? false,
        bodyFilter: filterState.bodyFilter ?? false,
        maConvergenceFilter: filterState.maConvergenceFilter ?? false,
      };
    }
    return {};
  }, [open, category, filterState]);

  // 팝업 내부에서만 사용하는 임시 상태
  const [tempState, setTempState] = useState<Partial<FilterState>>({});
  const [inputValue, setInputValue] = useState("10");

  // 팝업이 열릴 때마다 현재 필터 상태로 초기화 (open이 true일 때만)
  useEffect(() => {
    if (open) {
      setTempState(initialTempState);
      if (category === "ma") {
        setInputValue(
          filterState.lookbackDays?.toString() ||
            FILTER_DEFAULTS.LOOKBACK_DAYS.toString()
        );
      }
    }
  }, [
    open,
    initialTempState,
    category,
    filterState.lookbackDays,
    filterState.breakoutStrategy,
    filterState.volumeFilter,
    filterState.vcpFilter,
    filterState.bodyFilter,
    filterState.maConvergenceFilter,
  ]); // 의존성 최적화

  const handleApply = () => {
    if (category === "ma") {
      const lookbackDays = parseInt(inputValue, 10);
      if (
        !isNaN(lookbackDays) &&
        lookbackDays >= FILTER_DEFAULTS.MIN_LOOKBACK_DAYS &&
        lookbackDays <= FILTER_DEFAULTS.MAX_LOOKBACK_DAYS
      ) {
        onApply({
          ...tempState,
          lookbackDays,
        });
        onOpenChange(false);
      } else {
        // 입력값이 유효하지 않으면 사용자에게 알림
        alert(
          `기간은 ${FILTER_DEFAULTS.MIN_LOOKBACK_DAYS}일에서 ${FILTER_DEFAULTS.MAX_LOOKBACK_DAYS}일 사이여야 합니다.`
        );
      }
    } else {
      onApply(tempState);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleReset = () => {
    if (category === "ma") {
      // 초기화 시 모든 이평선 필터를 false로 설정 (URL에서 제거)
      setTempState({
        ordered: false,
        goldenCross: false,
        justTurned: false,
        lookbackDays: FILTER_DEFAULTS.LOOKBACK_DAYS,
        ma20Above: false,
        ma50Above: false,
        ma100Above: false,
        ma200Above: false,
      });
      setInputValue(FILTER_DEFAULTS.LOOKBACK_DAYS.toString());
    } else if (category === "growth") {
      setTempState({
        revenueGrowth: false,
        revenueGrowthQuarters: FILTER_DEFAULTS.REVENUE_GROWTH_QUARTERS,
        revenueGrowthRate: null,
        incomeGrowth: false,
        incomeGrowthQuarters: FILTER_DEFAULTS.INCOME_GROWTH_QUARTERS,
        incomeGrowthRate: null,
        pegFilter: false,
      });
    } else if (category === "profitability") {
      setTempState({
        profitability: "all",
        turnAround: false,
      });
    } else if (category === "price") {
      setTempState({
        breakoutStrategy: null,
      });
    } else if (category === "noise") {
      setTempState({
        volumeFilter: false,
        vcpFilter: false,
        bodyFilter: false,
        maConvergenceFilter: false,
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
                    checked={tempState.ordered ?? false}
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
                    (MA20 {">"} MA50 {">"} MA200)
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
                    checked={tempState.goldenCross ?? false}
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

              {/* 이평선 위 필터 */}
              <div className="bg-card rounded-lg px-4 py-2.5 border shadow-sm">
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-muted-foreground mb-2">
                    이평선 위
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {(
                      [
                        { key: "ma20Above", label: "20MA" },
                        { key: "ma50Above", label: "50MA" },
                        { key: "ma100Above", label: "100MA" },
                        { key: "ma200Above", label: "200MA" },
                      ] as const
                    ).map(({ key, label }) => {
                      // 타입 안전성을 위해 key가 tempState의 키인지 확인
                      const stateKey = key as keyof typeof tempState;
                      const isChecked =
                        (tempState[stateKey] as boolean | undefined) ?? false;

                      return (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            id={key}
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              setTempState({
                                ...tempState,
                                [key]: checked === true,
                              })
                            }
                            disabled={disabled}
                          />
                          <label
                            htmlFor={key}
                            className="text-sm leading-none cursor-pointer select-none"
                          >
                            {label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
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
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[80px]">
                    {profitabilityOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="cursor-pointer text-sm"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
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
                  가장 최근 EPS가 양수이고 직전 분기 EPS가 0 이하인 기업만
                  보여줍니다. EPS 데이터가 2분기 이상 없으면 제외됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 가격필터 섹션 */}
          {category === "price" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  EOD(종가) 데이터 기준으로 어제 거래일의 가격 패턴을
                  분석합니다.
                </p>

                {/* 전략 선택 라디오 버튼 그룹 */}
                <div className="space-y-3">
                  {/* 없음 옵션 */}
                  <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() =>
                      !disabled &&
                      setTempState({ ...tempState, breakoutStrategy: null })
                    }
                    onKeyDown={(e) => {
                      if (!disabled && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setTempState({ ...tempState, breakoutStrategy: null });
                      }
                    }}
                  >
                    <input
                      type="radio"
                      id="breakout-none"
                      name="breakoutStrategy"
                      checked={
                        tempState.breakoutStrategy === null ||
                        tempState.breakoutStrategy === undefined
                      }
                      onChange={() =>
                        setTempState({ ...tempState, breakoutStrategy: null })
                      }
                      disabled={disabled}
                      className="h-4 w-4 cursor-pointer"
                    />
                    <label
                      htmlFor="breakout-none"
                      className="flex-1 text-sm font-medium leading-none cursor-pointer"
                    >
                      필터 없음
                    </label>
                  </div>

                  {/* 확정 돌파 전략 */}
                  <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() =>
                      !disabled &&
                      setTempState({
                        ...tempState,
                        breakoutStrategy: "confirmed",
                      })
                    }
                    onKeyDown={(e) => {
                      if (!disabled && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setTempState({
                          ...tempState,
                          breakoutStrategy: "confirmed",
                        });
                      }
                    }}
                  >
                    <input
                      type="radio"
                      id="breakout-confirmed"
                      name="breakoutStrategy"
                      checked={tempState.breakoutStrategy === "confirmed"}
                      onChange={() =>
                        setTempState({
                          ...tempState,
                          breakoutStrategy: "confirmed",
                        })
                      }
                      disabled={disabled}
                      className="h-4 w-4 cursor-pointer"
                    />
                    <label
                      htmlFor="breakout-confirmed"
                      className="flex-1 text-sm font-medium leading-none cursor-pointer"
                    >
                      확정 돌파
                    </label>
                    <span className="text-xs text-muted-foreground">
                      (신고가 돌파 + 거래량 폭증 + 강한 양봉)
                    </span>
                  </div>

                  {/* 재테스트 전략 */}
                  <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() =>
                      !disabled &&
                      setTempState({ ...tempState, breakoutStrategy: "retest" })
                    }
                    onKeyDown={(e) => {
                      if (!disabled && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setTempState({
                          ...tempState,
                          breakoutStrategy: "retest",
                        });
                      }
                    }}
                  >
                    <input
                      type="radio"
                      id="breakout-retest"
                      name="breakoutStrategy"
                      checked={tempState.breakoutStrategy === "retest"}
                      onChange={() =>
                        setTempState({
                          ...tempState,
                          breakoutStrategy: "retest",
                        })
                      }
                      disabled={disabled}
                      className="h-4 w-4 cursor-pointer"
                    />
                    <label
                      htmlFor="breakout-retest"
                      className="flex-1 text-sm font-medium leading-none cursor-pointer"
                    >
                      재테스트
                    </label>
                    <span className="text-xs text-muted-foreground">
                      (정배열 + 과거 돌파 이력 + 20일선 부근)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 노이즈 필터 섹션 */}
          {category === "noise" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  노이즈가 적고 깔끔한 종목만 선별합니다. 소외주, 잡주, 속임수가
                  많은 종목을 걸러냅니다.
                </p>

                <div className="space-y-3">
                  {/* 거래량 필터 */}
                  <div className="bg-card rounded-lg px-4 py-2.5 border shadow-sm hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 h-10">
                      <Checkbox
                        id="volumeFilter"
                        checked={tempState.volumeFilter ?? false}
                        onCheckedChange={(checked) =>
                          setTempState({
                            ...tempState,
                            volumeFilter: checked === true,
                          })
                        }
                        disabled={disabled}
                      />
                      <label
                        htmlFor="volumeFilter"
                        className="flex-1 text-sm font-semibold leading-none cursor-pointer select-none"
                      >
                        거래량 필터
                      </label>
                      <span className="text-xs text-muted-foreground">
                        (인기 없는 놈은 쳐낸다)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6 mt-1">
                      평균 거래대금 {">"} $10M OR 평균 거래량 {">"} 500K
                    </p>
                  </div>

                  {/* VCP 필터 */}
                  <div className="bg-card rounded-lg px-4 py-2.5 border shadow-sm hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 h-10">
                      <Checkbox
                        id="vcpFilter"
                        checked={tempState.vcpFilter ?? false}
                        onCheckedChange={(checked) =>
                          setTempState({
                            ...tempState,
                            vcpFilter: checked === true,
                          })
                        }
                        disabled={disabled}
                      />
                      <label
                        htmlFor="vcpFilter"
                        className="flex-1 text-sm font-semibold leading-none cursor-pointer select-none"
                      >
                        변동성 압축 (VCP)
                      </label>
                      <span className="text-xs text-muted-foreground">
                        (용수철처럼 눌린 놈만 찾는다)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6 mt-1">
                      ATR(14) / 현재가 {"<"} 5% AND Bollinger Band 폭 압축
                    </p>
                  </div>

                  {/* 캔들 몸통 필터 */}
                  <div className="bg-card rounded-lg px-4 py-2.5 border shadow-sm hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 h-10">
                      <Checkbox
                        id="bodyFilter"
                        checked={tempState.bodyFilter ?? false}
                        onCheckedChange={(checked) =>
                          setTempState({
                            ...tempState,
                            bodyFilter: checked === true,
                          })
                        }
                        disabled={disabled}
                      />
                      <label
                        htmlFor="bodyFilter"
                        className="flex-1 text-sm font-semibold leading-none cursor-pointer select-none"
                      >
                        캔들 몸통 필터
                      </label>
                      <span className="text-xs text-muted-foreground">
                        (지저분한 꼬리는 쳐낸다)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6 mt-1">
                      몸통이 전체 길이의 60% 이상
                    </p>
                  </div>

                  {/* 이평선 밀집 필터 */}
                  <div className="bg-card rounded-lg px-4 py-2.5 border shadow-sm hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 h-10">
                      <Checkbox
                        id="maConvergenceFilter"
                        checked={tempState.maConvergenceFilter ?? false}
                        onCheckedChange={(checked) =>
                          setTempState({
                            ...tempState,
                            maConvergenceFilter: checked === true,
                          })
                        }
                        disabled={disabled}
                      />
                      <label
                        htmlFor="maConvergenceFilter"
                        className="flex-1 text-sm font-semibold leading-none cursor-pointer select-none"
                      >
                        이평선 밀집 필터
                      </label>
                      <span className="text-xs text-muted-foreground">
                        (힘이 응축된 놈)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6 mt-1">
                      MA20-MA50 간격 {"<"} 3%
                    </p>
                  </div>
                </div>
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
