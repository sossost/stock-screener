"use client";

import React, { memo, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface GrowthFilterControlsProps {
  revenueGrowth: boolean;
  setRevenueGrowth: (value: boolean) => void;
  revenueGrowthQuarters: number;
  setRevenueGrowthQuarters: (value: number) => void;
  revenueGrowthRate: number | null;
  setRevenueGrowthRate: (value: number | null) => void;
  incomeGrowth: boolean;
  setIncomeGrowth: (value: boolean) => void;
  incomeGrowthQuarters: number;
  setIncomeGrowthQuarters: (value: number) => void;
  incomeGrowthRate: number | null;
  setIncomeGrowthRate: (value: number | null) => void;
  pegFilter: boolean;
  setPegFilter: (value: boolean) => void;
}

export const GrowthFilterControls = memo(function GrowthFilterControls({
  revenueGrowth,
  setRevenueGrowth,
  revenueGrowthQuarters,
  setRevenueGrowthQuarters,
  revenueGrowthRate,
  setRevenueGrowthRate,
  incomeGrowth,
  setIncomeGrowth,
  incomeGrowthQuarters,
  setIncomeGrowthQuarters,
  incomeGrowthRate,
  setIncomeGrowthRate,
  pegFilter,
  setPegFilter,
}: GrowthFilterControlsProps) {
  // 로컬 상태로 입력값 관리 (입력 중에는 API 호출 안함)
  const [revenueQuartersInput, setRevenueQuartersInput] = React.useState(
    revenueGrowthQuarters.toString()
  );
  const [revenueRateInput, setRevenueRateInput] = React.useState(
    revenueGrowthRate?.toString() ?? ""
  );
  const [incomeQuartersInput, setIncomeQuartersInput] = React.useState(
    incomeGrowthQuarters.toString()
  );
  const [incomeRateInput, setIncomeRateInput] = React.useState(
    incomeGrowthRate?.toString() ?? ""
  );

  // props가 변경되면 로컬 상태도 업데이트
  React.useEffect(() => {
    setRevenueQuartersInput(revenueGrowthQuarters.toString());
  }, [revenueGrowthQuarters]);

  React.useEffect(() => {
    setRevenueRateInput(revenueGrowthRate?.toString() ?? "");
  }, [revenueGrowthRate]);

  React.useEffect(() => {
    setIncomeQuartersInput(incomeGrowthQuarters.toString());
  }, [incomeGrowthQuarters]);

  React.useEffect(() => {
    setIncomeRateInput(incomeGrowthRate?.toString() ?? "");
  }, [incomeGrowthRate]);

  const handleRevenueQuartersChange = useCallback((value: string) => {
    setRevenueQuartersInput(value);
  }, []);

  const handleRevenueQuartersConfirm = useCallback(() => {
    const num = Number(revenueQuartersInput);
    if (num >= 2 && num <= 8 && num !== revenueGrowthQuarters) {
      setRevenueGrowthQuarters(num);
    } else {
      setRevenueQuartersInput(revenueGrowthQuarters.toString());
    }
  }, [revenueQuartersInput, revenueGrowthQuarters, setRevenueGrowthQuarters]);

  const handleRevenueRateChange = useCallback((value: string) => {
    setRevenueRateInput(value);
  }, []);

  const handleRevenueRateConfirm = useCallback(() => {
    const value = revenueRateInput.trim();
    if (value === "") {
      setRevenueGrowthRate(null);
      return;
    }
    const num = Number(value);
    if (!isNaN(num) && num >= 0 && num <= 1000) {
      setRevenueGrowthRate(num);
    } else {
      setRevenueRateInput(revenueGrowthRate?.toString() ?? "");
    }
  }, [revenueRateInput, revenueGrowthRate, setRevenueGrowthRate]);

  const handleIncomeQuartersChange = useCallback((value: string) => {
    setIncomeQuartersInput(value);
  }, []);

  const handleIncomeQuartersConfirm = useCallback(() => {
    const num = Number(incomeQuartersInput);
    if (num >= 2 && num <= 8 && num !== incomeGrowthQuarters) {
      setIncomeGrowthQuarters(num);
    } else {
      setIncomeQuartersInput(incomeGrowthQuarters.toString());
    }
  }, [incomeQuartersInput, incomeGrowthQuarters, setIncomeGrowthQuarters]);

  const handleIncomeRateChange = useCallback((value: string) => {
    setIncomeRateInput(value);
  }, []);

  const handleIncomeRateConfirm = useCallback(() => {
    const value = incomeRateInput.trim();
    if (value === "") {
      setIncomeGrowthRate(null);
      return;
    }
    const num = Number(value);
    if (!isNaN(num) && num >= 0 && num <= 1000) {
      setIncomeGrowthRate(num);
    } else {
      setIncomeRateInput(incomeGrowthRate?.toString() ?? "");
    }
  }, [incomeRateInput, incomeGrowthRate, setIncomeGrowthRate]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 매출 성장 필터 */}
      <div className="flex items-center gap-3 bg-card rounded-lg px-4 py-2.5 border shadow-sm hover:bg-accent/50 transition-colors h-12">
        <div className="flex items-center gap-2">
          <Checkbox
            id="revenueGrowth"
            checked={revenueGrowth}
            onCheckedChange={(checked) => setRevenueGrowth(checked === true)}
          />
          <label
            htmlFor="revenueGrowth"
            className="text-sm font-semibold leading-none cursor-pointer select-none"
          >
            매출 성장
          </label>
        </div>
        <div className="w-px h-6 bg-border"></div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="revenueQuarters"
              className="text-xs text-muted-foreground font-medium whitespace-nowrap"
            >
              연속 분기
            </label>
            <input
              id="revenueQuarters"
              type="number"
              min="2"
              max="8"
              value={revenueQuartersInput}
              onChange={(e) => handleRevenueQuartersChange(e.target.value)}
              onBlur={handleRevenueQuartersConfirm}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRevenueQuartersConfirm();
                }
              }}
              disabled={!revenueGrowth}
              className="h-8 w-12 rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="3"
            />
            <span className="text-xs text-muted-foreground">분기</span>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="revenueRate"
              className="text-xs text-muted-foreground font-medium whitespace-nowrap"
            >
              평균 성장률
            </label>
            <input
              id="revenueRate"
              type="number"
              min="0"
              max="1000"
              step="0.1"
              value={revenueRateInput}
              onChange={(e) => handleRevenueRateChange(e.target.value)}
              onBlur={handleRevenueRateConfirm}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRevenueRateConfirm();
                }
              }}
              disabled={!revenueGrowth}
              className="h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="30"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* 수익 성장 필터 */}
      <div className="flex items-center gap-3 bg-card rounded-lg px-4 py-2.5 border shadow-sm hover:bg-accent/50 transition-colors h-12">
        <div className="flex items-center gap-2">
          <Checkbox
            id="incomeGrowth"
            checked={incomeGrowth}
            onCheckedChange={(checked) => setIncomeGrowth(checked === true)}
          />
          <label
            htmlFor="incomeGrowth"
            className="text-sm font-semibold leading-none cursor-pointer select-none"
          >
            수익 성장
          </label>
        </div>
        <div className="w-px h-6 bg-border"></div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="incomeQuarters"
              className="text-xs text-muted-foreground font-medium whitespace-nowrap"
            >
              연속 분기
            </label>
            <input
              id="incomeQuarters"
              type="number"
              min="2"
              max="8"
              value={incomeQuartersInput}
              onChange={(e) => handleIncomeQuartersChange(e.target.value)}
              onBlur={handleIncomeQuartersConfirm}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleIncomeQuartersConfirm();
                }
              }}
              disabled={!incomeGrowth}
              className="h-8 w-12 rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="3"
            />
            <span className="text-xs text-muted-foreground">분기</span>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="incomeRate"
              className="text-xs text-muted-foreground font-medium whitespace-nowrap"
            >
              평균 성장률
            </label>
            <input
              id="incomeRate"
              type="number"
              min="0"
              max="1000"
              step="0.1"
              value={incomeRateInput}
              onChange={(e) => handleIncomeRateChange(e.target.value)}
              onBlur={handleIncomeRateConfirm}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleIncomeRateConfirm();
                }
              }}
              disabled={!incomeGrowth}
              className="h-8 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="30"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* PEG 필터 */}
      <div className="flex items-center gap-3 bg-card rounded-lg px-4 py-2.5 border shadow-sm hover:bg-accent/50 transition-colors h-12">
        <div className="flex items-center gap-2">
          <Checkbox
            id="pegFilter"
            checked={pegFilter}
            onCheckedChange={(checked) => setPegFilter(checked === true)}
          />
          <label
            htmlFor="pegFilter"
            className="text-sm font-semibold leading-none cursor-pointer select-none"
          >
            저평가
          </label>
          <span className="text-xs text-muted-foreground">(PEG {"<"} 1)</span>
        </div>
      </div>
    </div>
  );
});
