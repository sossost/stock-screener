import {
  useQueryState,
  parseAsBoolean,
  parseAsInteger,
  parseAsStringLiteral,
  parseAsString,
} from "nuqs";
import { filterDefaults, profitabilityValues } from "@/lib/filters/schema";

/**
 * 필터 상태 관리 커스텀 훅
 * 모든 필터 상태를 URL 쿼리 파라미터로 관리
 */
export function useFilterState() {
  const [ordered, setOrdered] = useQueryState("ordered", parseAsBoolean);
  const [goldenCross, setGoldenCross] = useQueryState(
    "goldenCross",
    parseAsBoolean
  );
  const [justTurned, setJustTurned] = useQueryState(
    "justTurned",
    parseAsBoolean
  );
  const [lookbackDays, setLookbackDays] = useQueryState(
    "lookbackDays",
    parseAsInteger
  );

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

  const [pegFilter, setPegFilter] = useQueryState(
    "pegFilter",
    parseAsBoolean.withDefault(false)
  );

  const [ma20Above, setMa20Above] = useQueryState("ma20Above", parseAsBoolean);
  const [ma50Above, setMa50Above] = useQueryState("ma50Above", parseAsBoolean);
  const [ma100Above, setMa100Above] = useQueryState(
    "ma100Above",
    parseAsBoolean
  );
  const [ma200Above, setMa200Above] = useQueryState(
    "ma200Above",
    parseAsBoolean
  );

  const [breakoutStrategyRaw, setBreakoutStrategyRaw] = useQueryState(
    "breakoutStrategy",
    parseAsString
  );

  // breakoutStrategy를 "confirmed" | "retest" | null로 변환
  const breakoutStrategy: "confirmed" | "retest" | null =
    breakoutStrategyRaw === "confirmed" || breakoutStrategyRaw === "retest"
      ? breakoutStrategyRaw
      : null;

  const setBreakoutStrategy = async (
    value: "confirmed" | "retest" | null
  ): Promise<URLSearchParams> => {
    return setBreakoutStrategyRaw(value);
  };

  const [volumeFilter, setVolumeFilter] = useQueryState(
    "volumeFilter",
    parseAsBoolean.withDefault(filterDefaults.volumeFilter)
  );
  const [vcpFilter, setVcpFilter] = useQueryState(
    "vcpFilter",
    parseAsBoolean.withDefault(filterDefaults.vcpFilter)
  );
  const [bodyFilter, setBodyFilter] = useQueryState(
    "bodyFilter",
    parseAsBoolean.withDefault(filterDefaults.bodyFilter)
  );
  const [maConvergenceFilter, setMaConvergenceFilter] = useQueryState(
    "maConvergenceFilter",
    parseAsBoolean.withDefault(filterDefaults.maConvergenceFilter)
  );

  return {
    ordered,
    setOrdered,
    goldenCross,
    setGoldenCross,
    justTurned,
    setJustTurned,
    lookbackDays,
    setLookbackDays,
    profitability,
    setProfitability,
    turnAround,
    setTurnAround,
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
    pegFilter,
    setPegFilter,
    ma20Above,
    setMa20Above,
    ma50Above,
    setMa50Above,
    ma100Above,
    setMa100Above,
    ma200Above,
    setMa200Above,
    breakoutStrategy,
    setBreakoutStrategy,
    volumeFilter,
    setVolumeFilter,
    vcpFilter,
    setVcpFilter,
    bodyFilter,
    setBodyFilter,
    maConvergenceFilter,
    setMaConvergenceFilter,
  };
}
