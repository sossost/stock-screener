import {
  useQueryState,
  parseAsBoolean,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs";
import { filterDefaults, profitabilityValues } from "@/lib/filters/schema";

/**
 * 필터 상태 관리 커스텀 훅
 * 모든 필터 상태를 URL 쿼리 파라미터로 관리
 */
export function useFilterState() {
  // 이평선 필터
  const [ordered, setOrdered] = useQueryState(
    "ordered",
    parseAsBoolean.withDefault(filterDefaults.ordered)
  );
  const [goldenCross, setGoldenCross] = useQueryState(
    "goldenCross",
    parseAsBoolean.withDefault(filterDefaults.goldenCross)
  );
  const [justTurned, setJustTurned] = useQueryState(
    "justTurned",
    parseAsBoolean.withDefault(filterDefaults.justTurned)
  );
  const [lookbackDays, setLookbackDays] = useQueryState(
    "lookbackDays",
    parseAsInteger.withDefault(filterDefaults.lookbackDays)
  );

  // 수익성 필터
  const [profitability, setProfitability] = useQueryState(
    "profitability",
    parseAsStringLiteral(
      profitabilityValues as Array<"all" | "profitable" | "unprofitable">
    ).withDefault(filterDefaults.profitability)
  );
  const [turnAround, setTurnAround] = useQueryState(
    "turnAround",
    parseAsBoolean.withDefault(filterDefaults.turnAround)
  );

  // 성장성 필터
  const [revenueGrowth, setRevenueGrowth] = useQueryState(
    "revenueGrowth",
    parseAsBoolean.withDefault(filterDefaults.revenueGrowth)
  );
  const [incomeGrowth, setIncomeGrowth] = useQueryState(
    "incomeGrowth",
    parseAsBoolean.withDefault(filterDefaults.incomeGrowth)
  );
  const [revenueGrowthQuarters, setRevenueGrowthQuarters] = useQueryState(
    "revenueGrowthQuarters",
    parseAsInteger.withDefault(filterDefaults.revenueGrowthQuarters)
  );
  const [incomeGrowthQuarters, setIncomeGrowthQuarters] = useQueryState(
    "incomeGrowthQuarters",
    parseAsInteger.withDefault(filterDefaults.incomeGrowthQuarters)
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

  // 이평선 위 필터
  const [ma20Above, setMa20Above] = useQueryState(
    "ma20Above",
    parseAsBoolean.withDefault(filterDefaults.ma20Above)
  );
  const [ma50Above, setMa50Above] = useQueryState(
    "ma50Above",
    parseAsBoolean.withDefault(filterDefaults.ma50Above)
  );
  const [ma100Above, setMa100Above] = useQueryState(
    "ma100Above",
    parseAsBoolean.withDefault(filterDefaults.ma100Above)
  );
  const [ma200Above, setMa200Above] = useQueryState(
    "ma200Above",
    parseAsBoolean.withDefault(filterDefaults.ma200Above)
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
    turnAround,
    setTurnAround,
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
    // 이평선 위 필터
    ma20Above,
    setMa20Above,
    ma50Above,
    setMa50Above,
    ma100Above,
    setMa100Above,
    ma200Above,
    setMa200Above,
  };
}
