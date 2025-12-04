import { z } from "zod";

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

  // URL 파라미터가 없으면 기본값 사용 (MA 필터는 false로 설정)
  const hasAnyParams = Object.keys(normalized).length > 0;
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
  }-${filters.breakoutStrategy ?? ""}`;
}
