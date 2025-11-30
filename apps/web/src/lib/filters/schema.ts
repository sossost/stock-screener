import { z } from "zod";

export const profitabilityOptions = [
  { value: "all", label: "전체" },
  { value: "profitable", label: "흑자" },
  { value: "unprofitable", label: "적자" },
] as const;

export const profitabilityValues = profitabilityOptions.map((opt) => opt.value);

export const filterDefaults = {
  ordered: true,
  goldenCross: true,
  justTurned: false,
  lookbackDays: 10,
  profitability: "all" as (typeof profitabilityValues)[number],
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
};

export const filterSchema = z.object({
  ordered: z.coerce.boolean().default(filterDefaults.ordered),
  goldenCross: z.coerce.boolean().default(filterDefaults.goldenCross),
  justTurned: z.coerce.boolean().default(filterDefaults.justTurned),
  lookbackDays: z.coerce.number().default(filterDefaults.lookbackDays),
  profitability: z.enum(profitabilityValues).default(filterDefaults.profitability),
  turnAround: z.coerce.boolean().default(filterDefaults.turnAround),
  revenueGrowth: z.coerce.boolean().default(filterDefaults.revenueGrowth),
  incomeGrowth: z.coerce.boolean().default(filterDefaults.incomeGrowth),
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
  pegFilter: z.coerce.boolean().default(filterDefaults.pegFilter),
  ma20Above: z.coerce.boolean().default(filterDefaults.ma20Above),
  ma50Above: z.coerce.boolean().default(filterDefaults.ma50Above),
  ma100Above: z.coerce.boolean().default(filterDefaults.ma100Above),
  ma200Above: z.coerce.boolean().default(filterDefaults.ma200Above),
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
    return result.data;
  }

  // 잘못된 쿼리 값이 들어온 경우 기본값으로 대체해 서버 렌더링이 실패하지 않도록 방어
  return { ...filterDefaults };
}

export function buildQueryParams(filters: ParsedFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("ordered", String(filters.ordered));
  params.set("goldenCross", String(filters.goldenCross));
  params.set("justTurned", String(filters.justTurned));
  params.set("lookbackDays", String(filters.lookbackDays));
  params.set("profitability", filters.profitability);
  params.set("turnAround", String(filters.turnAround));
  params.set("revenueGrowth", String(filters.revenueGrowth));
  params.set("incomeGrowth", String(filters.incomeGrowth));
  params.set(
    "revenueGrowthQuarters",
    String(filters.revenueGrowthQuarters)
  );
  params.set("incomeGrowthQuarters", String(filters.incomeGrowthQuarters));
  params.set("pegFilter", String(filters.pegFilter));
  params.set("ma20Above", String(filters.ma20Above));
  params.set("ma50Above", String(filters.ma50Above));
  params.set("ma100Above", String(filters.ma100Above));
  params.set("ma200Above", String(filters.ma200Above));

  if (filters.revenueGrowthRate !== null && filters.revenueGrowthRate !== undefined) {
    params.set("revenueGrowthRate", String(filters.revenueGrowthRate));
  }
  if (filters.incomeGrowthRate !== null && filters.incomeGrowthRate !== undefined) {
    params.set("incomeGrowthRate", String(filters.incomeGrowthRate));
  }

  return params;
}

export function buildCacheTag(filters: ParsedFilters): string {
  return `golden-cross-${filters.ordered}-${filters.goldenCross}-${filters.justTurned}-${filters.lookbackDays}-${filters.profitability}-${filters.revenueGrowth}-${filters.revenueGrowthQuarters}-${filters.revenueGrowthRate ?? ""}-${filters.incomeGrowth}-${filters.incomeGrowthQuarters}-${filters.incomeGrowthRate ?? ""}-${filters.pegFilter}-${filters.turnAround}-${filters.ma20Above}-${filters.ma50Above}-${filters.ma100Above}-${filters.ma200Above}`;
}
