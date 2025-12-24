import { z } from "zod";
import {
  parseAsBoolean,
  parseAsInteger,
  parseAsStringLiteral,
  createParser,
} from "nuqs";

export const profitabilityOptions = [
  { value: "all", label: "전체" },
  { value: "profitable", label: "흑자" },
  { value: "unprofitable", label: "적자" },
] as const;

export const profitabilityValues = profitabilityOptions.map((opt) => opt.value);

export const filterDefaults = {
  ordered: true, // URL 파라미터에 명시적으로 값이 있어야만 적용
  goldenCross: true, // URL 파라미터에 명시적으로 값이 있어야만 적용
  justTurned: false,
  lookbackDays: 10,
  profitability: "profitable" as (typeof profitabilityValues)[number],
  turnAround: false,
  revenueGrowth: false,
  incomeGrowth: false,
  revenueGrowthQuarters: 3,
  incomeGrowthQuarters: 3,
  revenueGrowthRate: null as number | null,
  incomeGrowthRate: null as number | null,
  pegFilter: false,
  ma20Above: false,
  ma50Above: false,
  ma100Above: false,
  ma200Above: false,
  breakoutStrategy: null as "confirmed" | "retest" | null,
  volumeFilter: false,
  vcpFilter: false,
  bodyFilter: false,
  maConvergenceFilter: false,
};

// breakoutStrategy 파서: "confirmed" | "retest" | null
const parseAsBreakoutStrategy = createParser({
  parse: (value: string) => {
    if (value === "confirmed" || value === "retest") {
      return value;
    }
    return null;
  },
  serialize: (value: "confirmed" | "retest" | null) => value ?? "",
});

/**
 * nuqs 파서 정의 (Single Source of Truth)
 * 새 필터 추가 시 이 객체에만 추가하면 URL/상태/타입이 자동 반영됨
 */
export const filterParsers = {
  // 이동평균 필터
  ordered: parseAsBoolean,
  goldenCross: parseAsBoolean,
  justTurned: parseAsBoolean,
  lookbackDays: parseAsInteger,

  // 수익성 필터
  profitability: parseAsStringLiteral([
    "all",
    "profitable",
    "unprofitable",
  ] as const).withDefault(filterDefaults.profitability),
  turnAround: parseAsBoolean.withDefault(filterDefaults.turnAround),

  // 성장성 필터
  revenueGrowth: parseAsBoolean.withDefault(filterDefaults.revenueGrowth),
  incomeGrowth: parseAsBoolean.withDefault(filterDefaults.incomeGrowth),
  revenueGrowthQuarters: parseAsInteger.withDefault(
    filterDefaults.revenueGrowthQuarters
  ),
  incomeGrowthQuarters: parseAsInteger.withDefault(
    filterDefaults.incomeGrowthQuarters
  ),
  revenueGrowthRate: parseAsInteger,
  incomeGrowthRate: parseAsInteger,

  // 밸류에이션 필터
  pegFilter: parseAsBoolean.withDefault(false),

  // 이동평균선 위 필터
  ma20Above: parseAsBoolean,
  ma50Above: parseAsBoolean,
  ma100Above: parseAsBoolean,
  ma200Above: parseAsBoolean,

  // 돌파매매 전략 필터
  breakoutStrategy: parseAsBreakoutStrategy,

  // 노이즈 필터
  volumeFilter: parseAsBoolean.withDefault(filterDefaults.volumeFilter),
  vcpFilter: parseAsBoolean.withDefault(filterDefaults.vcpFilter),
  bodyFilter: parseAsBoolean.withDefault(filterDefaults.bodyFilter),
  maConvergenceFilter: parseAsBoolean.withDefault(
    filterDefaults.maConvergenceFilter
  ),
};

// 문자열 "true"/"false"를 boolean으로 변환하는 커스텀 스키마
const booleanString = z
  .union([
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false),
    z.boolean(),
  ])
  .optional();

export const filterSchema = z.object({
  ordered: booleanString.default(filterDefaults.ordered),
  goldenCross: booleanString.default(filterDefaults.goldenCross),
  justTurned: booleanString.default(filterDefaults.justTurned),
  lookbackDays: z.coerce.number().default(filterDefaults.lookbackDays),
  profitability: z
    .enum(profitabilityValues)
    .default(filterDefaults.profitability),
  turnAround: booleanString.default(filterDefaults.turnAround),
  revenueGrowth: booleanString.default(filterDefaults.revenueGrowth),
  incomeGrowth: booleanString.default(filterDefaults.incomeGrowth),
  revenueGrowthQuarters: z.coerce
    .number()
    .default(filterDefaults.revenueGrowthQuarters),
  incomeGrowthQuarters: z.coerce
    .number()
    .default(filterDefaults.incomeGrowthQuarters),
  revenueGrowthRate: z
    .union([z.coerce.number(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  incomeGrowthRate: z
    .union([z.coerce.number(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  pegFilter: booleanString.default(filterDefaults.pegFilter),
  ma20Above: booleanString.default(filterDefaults.ma20Above),
  ma50Above: booleanString.default(filterDefaults.ma50Above),
  ma100Above: booleanString.default(filterDefaults.ma100Above),
  ma200Above: booleanString.default(filterDefaults.ma200Above),
  breakoutStrategy: z
    .enum(["confirmed", "retest"])
    .optional()
    .nullable()
    .default(filterDefaults.breakoutStrategy),
  volumeFilter: booleanString.default(filterDefaults.volumeFilter),
  vcpFilter: booleanString.default(filterDefaults.vcpFilter),
  bodyFilter: booleanString.default(filterDefaults.bodyFilter),
  maConvergenceFilter: booleanString.default(
    filterDefaults.maConvergenceFilter
  ),
});

export type ParsedFilters = z.infer<typeof filterSchema>;

function ensureRecord(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): Record<string, string | string[] | undefined> {
  if (searchParams instanceof URLSearchParams) {
    const obj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  return searchParams;
}

export function parseFilters(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): ParsedFilters {
  const raw = ensureRecord(searchParams);

  // normalize string[] to first value
  const normalized: Record<string, string> = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      normalized[key] = value[0];
    } else if (value !== undefined) {
      normalized[key] = value;
    }
  });

  const result = filterSchema.safeParse(normalized);
  if (result.success) {
    const data = result.data;

    // MA 필터는 URL에 명시적으로 파라미터가 있을 때만 적용
    // 파라미터가 없으면 false로 설정 (해제 상태)
    if (!Object.prototype.hasOwnProperty.call(normalized, "ordered")) {
      data.ordered = false;
    }
    if (!Object.prototype.hasOwnProperty.call(normalized, "goldenCross")) {
      data.goldenCross = false;
    }
    if (!Object.prototype.hasOwnProperty.call(normalized, "justTurned")) {
      data.justTurned = false;
    }
    if (!Object.prototype.hasOwnProperty.call(normalized, "ma20Above")) {
      data.ma20Above = false;
    }
    if (!Object.prototype.hasOwnProperty.call(normalized, "ma50Above")) {
      data.ma50Above = false;
    }
    if (!Object.prototype.hasOwnProperty.call(normalized, "ma100Above")) {
      data.ma100Above = false;
    }
    if (!Object.prototype.hasOwnProperty.call(normalized, "ma200Above")) {
      data.ma200Above = false;
    }
    if (!Object.prototype.hasOwnProperty.call(normalized, "breakoutStrategy")) {
      data.breakoutStrategy = null;
    }
    if (!Object.prototype.hasOwnProperty.call(normalized, "volumeFilter")) {
      data.volumeFilter = false;
    }
    if (!Object.prototype.hasOwnProperty.call(normalized, "vcpFilter")) {
      data.vcpFilter = false;
    }
    if (!Object.prototype.hasOwnProperty.call(normalized, "bodyFilter")) {
      data.bodyFilter = false;
    }
    if (
      !Object.prototype.hasOwnProperty.call(normalized, "maConvergenceFilter")
    ) {
      data.maConvergenceFilter = false;
    }

    return data;
  }

  // 잘못된 쿼리 값이 들어온 경우 기본값으로 대체해 서버 렌더링이 실패하지 않도록 방어
  return { ...filterDefaults };
}

export function buildQueryParams(filters: ParsedFilters): URLSearchParams {
  const params = new URLSearchParams();

  // 이평선 필터는 true일 때만 쿼리 파라미터에 포함 (URL 파라미터에 명시적으로 값이 있어야만 적용)
  if (filters.ordered === true) {
    params.set("ordered", "true");
  }
  // goldenCross는 서버 기본값이 true이므로, 항상 명시적으로 전달
  params.set("goldenCross", filters.goldenCross ? "true" : "false");
  if (filters.justTurned === true) {
    params.set("justTurned", "true");
  }
  if (
    filters.justTurned === true &&
    filters.lookbackDays !== filterDefaults.lookbackDays
  ) {
    params.set("lookbackDays", String(filters.lookbackDays));
  }

  params.set("profitability", filters.profitability);

  if (filters.turnAround === true) {
    params.set("turnAround", "true");
  }
  if (filters.revenueGrowth === true) {
    params.set("revenueGrowth", "true");
  }
  if (filters.incomeGrowth === true) {
    params.set("incomeGrowth", "true");
  }
  if (
    filters.revenueGrowth === true &&
    filters.revenueGrowthQuarters !== filterDefaults.revenueGrowthQuarters
  ) {
    params.set("revenueGrowthQuarters", String(filters.revenueGrowthQuarters));
  }
  if (
    filters.incomeGrowth === true &&
    filters.incomeGrowthQuarters !== filterDefaults.incomeGrowthQuarters
  ) {
    params.set("incomeGrowthQuarters", String(filters.incomeGrowthQuarters));
  }
  if (filters.pegFilter === true) {
    params.set("pegFilter", "true");
  }

  // 이평선 위 필터는 true일 때만 쿼리 파라미터에 포함
  if (filters.ma20Above === true) {
    params.set("ma20Above", "true");
  }
  if (filters.ma50Above === true) {
    params.set("ma50Above", "true");
  }
  if (filters.ma100Above === true) {
    params.set("ma100Above", "true");
  }
  if (filters.ma200Above === true) {
    params.set("ma200Above", "true");
  }

  if (
    filters.breakoutStrategy !== null &&
    filters.breakoutStrategy !== undefined
  ) {
    params.set("breakoutStrategy", filters.breakoutStrategy);
  }

  if (filters.volumeFilter === true) {
    params.set("volumeFilter", "true");
  }
  if (filters.vcpFilter === true) {
    params.set("vcpFilter", "true");
  }
  if (filters.bodyFilter === true) {
    params.set("bodyFilter", "true");
  }
  if (filters.maConvergenceFilter === true) {
    params.set("maConvergenceFilter", "true");
  }

  if (
    filters.revenueGrowthRate !== null &&
    filters.revenueGrowthRate !== undefined
  ) {
    params.set("revenueGrowthRate", String(filters.revenueGrowthRate));
  }
  if (
    filters.incomeGrowthRate !== null &&
    filters.incomeGrowthRate !== undefined
  ) {
    params.set("incomeGrowthRate", String(filters.incomeGrowthRate));
  }

  return params;
}

export function buildCacheTag(filters: ParsedFilters): string {
  return `golden-cross-${filters.ordered}-${filters.goldenCross}-${
    filters.justTurned
  }-${filters.lookbackDays}-${filters.profitability}-${filters.revenueGrowth}-${
    filters.revenueGrowthQuarters
  }-${filters.revenueGrowthRate ?? ""}-${filters.incomeGrowth}-${
    filters.incomeGrowthQuarters
  }-${filters.incomeGrowthRate ?? ""}-${filters.pegFilter}-${
    filters.turnAround
  }-${filters.ma20Above}-${filters.ma50Above}-${filters.ma100Above}-${
    filters.ma200Above
  }-${filters.breakoutStrategy ?? ""}-${filters.volumeFilter ?? ""}-${
    filters.vcpFilter ?? ""
  }-${filters.bodyFilter ?? ""}-${filters.maConvergenceFilter ?? ""}`;
}
