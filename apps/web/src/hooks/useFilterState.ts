import {
  useQueryState,
  parseAsBoolean,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs";

/**
 * 필터 상태 관리 커스텀 훅
 * 모든 필터 상태를 URL 쿼리 파라미터로 관리
 */
export function useFilterState() {
  // 이평선 필터
  const [ordered, setOrdered] = useQueryState(
    "ordered",
    parseAsBoolean.withDefault(true)
  );
  const [goldenCross, setGoldenCross] = useQueryState(
    "goldenCross",
    parseAsBoolean.withDefault(true)
  );
  const [justTurned, setJustTurned] = useQueryState(
    "justTurned",
    parseAsBoolean.withDefault(false)
  );
  const [lookbackDays, setLookbackDays] = useQueryState(
    "lookbackDays",
    parseAsInteger.withDefault(10)
  );

  // 수익성 필터
  const [profitability, setProfitability] = useQueryState(
    "profitability",
    parseAsStringLiteral([
      "all",
      "profitable",
      "unprofitable",
    ] as const).withDefault("all")
  );

  // 성장성 필터
  const [revenueGrowth, setRevenueGrowth] = useQueryState(
    "revenueGrowth",
    parseAsBoolean.withDefault(false)
  );
  const [incomeGrowth, setIncomeGrowth] = useQueryState(
    "incomeGrowth",
    parseAsBoolean.withDefault(false)
  );
  const [revenueGrowthQuarters, setRevenueGrowthQuarters] = useQueryState(
    "revenueGrowthQuarters",
    parseAsInteger.withDefault(3)
  );
  const [incomeGrowthQuarters, setIncomeGrowthQuarters] = useQueryState(
    "incomeGrowthQuarters",
    parseAsInteger.withDefault(3)
  );
  const [revenueGrowthRate, setRevenueGrowthRate] = useQueryState(
    "revenueGrowthRate",
    parseAsInteger
  );
  const [incomeGrowthRate, setIncomeGrowthRate] = useQueryState(
    "incomeGrowthRate",
    parseAsInteger
  );

  // PEG 필터
  const [pegFilter, setPegFilter] = useQueryState(
    "pegFilter",
    parseAsBoolean.withDefault(false)
  );

  return {
    // 이평선 필터
    ordered,
    setOrdered,
    goldenCross,
    setGoldenCross,
    justTurned,
    setJustTurned,
    lookbackDays,
    setLookbackDays,
    // 수익성 필터
    profitability,
    setProfitability,
    // 성장성 필터
    revenueGrowth,
    setRevenueGrowth,
    incomeGrowth,
    setIncomeGrowth,
    revenueGrowthQuarters,
    setRevenueGrowthQuarters,
    incomeGrowthQuarters,
    setIncomeGrowthQuarters,
    revenueGrowthRate,
    setRevenueGrowthRate,
    incomeGrowthRate,
    setIncomeGrowthRate,
    // PEG 필터
    pegFilter,
    setPegFilter,
  };
}

