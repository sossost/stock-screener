// lib/screener/query-builder.ts
// 스크리너 쿼리 빌더 - 모듈화된 SQL 구성
import { sql, SQL } from "drizzle-orm";
import type { ScreenerParams } from "@/types/screener";
import { QUERY_CONSTANTS, FILTER_DEFAULTS } from "@/lib/filters/constants";

/**
 * 파라미터 유효성 검사
 */
/**
 * MA 데이터가 필요한 필터가 활성화되어 있는지 확인
 */
function requiresMA(params: ScreenerParams): boolean {
  return (
    params.ordered === true ||
    params.goldenCross === true ||
    params.justTurned === true ||
    params.ma20Above === true ||
    params.ma50Above === true ||
    params.ma100Above === true ||
    params.ma200Above === true
  );
}

export function validateParams(params: ScreenerParams): {
  valid: boolean;
  error?: string;
} {
  const {
    revenueGrowthQuarters = FILTER_DEFAULTS.REVENUE_GROWTH_QUARTERS,
    incomeGrowthQuarters = FILTER_DEFAULTS.INCOME_GROWTH_QUARTERS,
  } = params;

  if (revenueGrowthQuarters < 2 || revenueGrowthQuarters > 8) {
    return {
      valid: false,
      error: "revenueGrowthQuarters must be between 2 and 8",
    };
  }
  if (incomeGrowthQuarters < 2 || incomeGrowthQuarters > 8) {
    return {
      valid: false,
      error: "incomeGrowthQuarters must be between 2 and 8",
    };
  }
  if (
    params.revenueGrowthRate !== null &&
    params.revenueGrowthRate !== undefined &&
    (params.revenueGrowthRate < 0 || params.revenueGrowthRate > 1000)
  ) {
    return {
      valid: false,
      error: "revenueGrowthRate must be between 0 and 1000",
    };
  }
  if (
    params.incomeGrowthRate !== null &&
    params.incomeGrowthRate !== undefined &&
    (params.incomeGrowthRate < 0 || params.incomeGrowthRate > 1000)
  ) {
    return {
      valid: false,
      error: "incomeGrowthRate must be between 0 and 1000",
    };
  }

  return { valid: true };
}

/**
 * 숫자/문자열 값을 안전하게 파싱
 */
export function parseNumericValue(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const str = String(val).trim();
  if (str === "" || str === "null" || str === "undefined") return null;
  const num = parseFloat(str);
  return isNaN(num) || !isFinite(num) ? null : num;
}

/**
 * 최신 거래일 CTE 생성
 */
function buildLastDateCTE(requireMA: boolean): SQL {
  if (requireMA) {
    return sql`
      SELECT MAX(date)::date AS d
      FROM daily_ma
    `;
  }
  return sql`
    SELECT MAX(date)::date AS d
    FROM daily_prices
  `;
}

/**
 * 현재 데이터 CTE 생성 (MA 조건 포함)
 */
function buildCurrentDataCTE(params: ScreenerParams, requireMA: boolean): SQL {
  const { ordered = false, goldenCross = true } = params; // goldenCross 기본값 true (성능 최적화)

  if (requireMA) {
    return sql`
      SELECT
        dm.symbol,
        dm.date::date AS d,
        dm.ma20, dm.ma50, dm.ma100, dm.ma200,
        dm.vol_ma30,
        pr.adj_close::numeric AS close,
        pr.rs_score
      FROM daily_ma dm
      JOIN last_d ld ON dm.date::date = ld.d
      LEFT JOIN daily_prices pr ON pr.symbol = dm.symbol AND pr.date::date = ld.d
      WHERE dm.ma20 IS NOT NULL 
        AND dm.ma50 IS NOT NULL 
        AND dm.ma100 IS NOT NULL 
        AND dm.ma200 IS NOT NULL
        ${
          ordered
            ? sql`AND dm.ma20 > dm.ma50 AND dm.ma50 > dm.ma100 AND dm.ma100 > dm.ma200`
            : sql``
        }
        ${goldenCross ? sql`AND dm.ma50 > dm.ma200` : sql``}
        AND dm.symbol ~ '^[A-Z]{1,6}$'
        AND dm.symbol NOT LIKE '%W'
        AND dm.symbol NOT LIKE '%X'
        AND dm.symbol NOT LIKE '%U'
        AND dm.symbol NOT LIKE '%WS'
    `;
  }

  // requireMA = false일 때는 각 심볼의 최신 데이터를 가져옴
  // daily_ma에서 MA 데이터를 LEFT JOIN하여 정배열 여부 확인 (MA 데이터가 없어도 포함)
  return sql`
    SELECT
      dp.symbol,
      dp.date::date AS d,
      dm.ma20,
      dm.ma50,
      dm.ma100,
      dm.ma200,
      dm.vol_ma30,
      dp.adj_close::numeric AS close,
      dp.rs_score
    FROM daily_prices dp
    LEFT JOIN daily_ma dm ON dm.symbol = dp.symbol AND dm.date = dp.date
    WHERE dp.symbol ~ '^[A-Z]{1,6}$'
      AND dp.symbol NOT LIKE '%W'
      AND dp.symbol NOT LIKE '%X'
      AND dp.symbol NOT LIKE '%U'
      AND dp.symbol NOT LIKE '%WS'
      AND (dp.symbol, dp.date::date) IN (
        SELECT symbol, MAX(date::date)
        FROM daily_prices
        WHERE symbol ~ '^[A-Z]{1,6}$'
          AND symbol NOT LIKE '%W'
          AND symbol NOT LIKE '%X'
          AND symbol NOT LIKE '%U'
          AND symbol NOT LIKE '%WS'
        GROUP BY symbol
      )
  `;
}

/**
 * 기본 필터 조건 CTE 생성
 */
function buildCandidatesCTE(params: ScreenerParams): SQL {
  const { minAvgVol = 0, minPrice = 0, minMcap = 0, allowOTC = true } = params;

  return sql`
    SELECT c.symbol, c.d, c.ma20, c.ma50, c.ma100, c.ma200, c.vol_ma30, c.close, c.rs_score
    FROM cur c
    LEFT JOIN symbols s ON s.symbol = c.symbol
    WHERE
      (${minAvgVol} = 0 OR c.vol_ma30 IS NULL OR c.vol_ma30 >= ${minAvgVol})
      AND (${minPrice} = 0 OR c.close IS NULL OR c.close >= ${minPrice})
      AND (${minMcap} = 0 OR s.market_cap IS NULL OR s.market_cap::numeric >= ${minMcap})
      AND (${
        allowOTC
          ? sql`TRUE`
          : sql`(s.exchange IS NULL OR (s.exchange NOT ILIKE 'OTC%' AND s.exchange NOT ILIKE 'PINK%'))`
      })
  `;
}

/**
 * 전일 이동평균 CTE 생성
 */
function buildPrevMACTE(): SQL {
  return sql`
    SELECT
      b.symbol,
      b.d,
      AVG(b.close) OVER (PARTITION BY b.symbol ORDER BY b.d ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) AS ma20,
      AVG(b.close) OVER (PARTITION BY b.symbol ORDER BY b.d ROWS BETWEEN 49 PRECEDING AND CURRENT ROW) AS ma50,
      AVG(b.close) OVER (PARTITION BY b.symbol ORDER BY b.d ROWS BETWEEN 99 PRECEDING AND CURRENT ROW) AS ma100,
      AVG(b.close) OVER (PARTITION BY b.symbol ORDER BY b.d ROWS BETWEEN 199 PRECEDING AND CURRENT ROW) AS ma200,
      ROW_NUMBER() OVER (PARTITION BY b.symbol ORDER BY b.d DESC) AS rn
    FROM (
      SELECT
        dp.symbol,
        dp.date::date AS d,
        dp.adj_close::numeric AS close
      FROM daily_prices dp
      JOIN last_d ld ON dp.date::date <= ld.d
      JOIN (SELECT DISTINCT symbol FROM candidates) cand ON cand.symbol = dp.symbol
      WHERE dp.date::date >= ((SELECT d FROM last_d) - INTERVAL '220 day')
    ) b
  `;
}

/**
 * 정배열 전환 상태 CTE 생성
 */
function buildPrevStatusCTE(maxRn: number): SQL {
  return sql`
    SELECT 
      symbol,
      COUNT(*) FILTER (
        WHERE NOT (ma20 > ma50 AND ma50 > ma100 AND ma100 > ma200)
      ) AS non_ordered_days_count
    FROM prev_ma
    WHERE rn BETWEEN 2 AND ${maxRn}
    GROUP BY symbol
  `;
}

/**
 * 분기 재무 데이터 서브쿼리 생성
 */
function buildQuarterlyFinancialsCTE(
  revenueGrowthQuarters: number,
  incomeGrowthQuarters: number
): SQL {
  return sql`
    SELECT
      json_agg(
        json_build_object(
          'period_end_date', period_end_date,
          'revenue', revenue::numeric,
          'net_income', net_income::numeric,
          'eps_diluted', eps_diluted::numeric
        ) ORDER BY period_end_date DESC
      ) as quarterly_data,
      (
        SELECT eps_diluted::numeric
        FROM quarterly_financials
        WHERE symbol = cand.symbol AND eps_diluted IS NOT NULL
        ORDER BY period_end_date DESC
        LIMIT 1
      ) as eps_q1,
      (
        SELECT eps_diluted::numeric
        FROM quarterly_financials
        WHERE symbol = cand.symbol AND eps_diluted IS NOT NULL
        ORDER BY period_end_date DESC
        OFFSET 1 LIMIT 1
      ) as eps_prev,
      CASE
        WHEN (SELECT COUNT(*) FROM quarterly_financials WHERE symbol = cand.symbol AND eps_diluted IS NOT NULL) < 2 THEN NULL
        WHEN (SELECT eps_diluted::numeric FROM quarterly_financials WHERE symbol = cand.symbol AND eps_diluted IS NOT NULL ORDER BY period_end_date DESC LIMIT 1) > 0
          AND COALESCE((SELECT eps_diluted::numeric FROM quarterly_financials WHERE symbol = cand.symbol AND eps_diluted IS NOT NULL ORDER BY period_end_date DESC OFFSET 1 LIMIT 1), 0) <= 0 THEN TRUE
        ELSE FALSE
      END AS turned_profitable,
      -- 연속 매출 성장 분기 수
      (
        WITH revenue_data AS (
          SELECT revenue::numeric as rev, period_end_date, ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
          FROM quarterly_financials
          WHERE symbol = cand.symbol AND revenue IS NOT NULL
          ORDER BY period_end_date DESC
          LIMIT 8
        ),
        revenue_growth_check AS (
          SELECT rev, LAG(rev) OVER (ORDER BY period_end_date ASC) as prev_rev, rn,
            CASE WHEN rev > LAG(rev) OVER (ORDER BY period_end_date ASC) THEN 1 ELSE 0 END as is_growth
          FROM revenue_data
        )
        SELECT COALESCE(
          (SELECT COUNT(*) FROM revenue_growth_check
           WHERE rn >= 1 AND is_growth = 1
           AND rn <= COALESCE((SELECT MIN(rn) FROM revenue_growth_check WHERE rn >= 1 AND is_growth = 0), 8)),
          0
        )
      ) as revenue_growth_quarters,
      -- 연속 수익 성장 분기 수
      (
        WITH income_data AS (
          SELECT eps_diluted::numeric as eps, period_end_date, ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
          FROM quarterly_financials
          WHERE symbol = cand.symbol AND eps_diluted IS NOT NULL
          ORDER BY period_end_date DESC
          LIMIT 8
        ),
        income_growth_check AS (
          SELECT eps, LAG(eps) OVER (ORDER BY period_end_date ASC) as prev_eps, rn,
            CASE WHEN eps > LAG(eps) OVER (ORDER BY period_end_date ASC) THEN 1 ELSE 0 END as is_growth
          FROM income_data
        )
        SELECT COALESCE(
          (SELECT COUNT(*) FROM income_growth_check
           WHERE rn >= 1 AND is_growth = 1
           AND rn <= COALESCE((SELECT MIN(rn) FROM income_growth_check WHERE rn >= 1 AND is_growth = 0), 8)),
          0
        )
      ) as income_growth_quarters,
      -- 평균 매출 성장률
      (
        WITH revenue_data AS (
          SELECT revenue::numeric as rev, period_end_date, ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
          FROM quarterly_financials
          WHERE symbol = cand.symbol AND revenue IS NOT NULL
          ORDER BY period_end_date DESC
          LIMIT ${revenueGrowthQuarters}
        ),
        revenue_growth_rates AS (
          SELECT rev, LAG(rev) OVER (ORDER BY period_end_date ASC) as prev_rev,
            CASE 
              WHEN LAG(rev) OVER (ORDER BY period_end_date ASC) = 0 THEN NULL
              WHEN LAG(rev) OVER (ORDER BY period_end_date ASC) IS NULL THEN NULL
              ELSE ((rev - LAG(rev) OVER (ORDER BY period_end_date ASC)) / NULLIF(LAG(rev) OVER (ORDER BY period_end_date ASC), 0)) * 100
            END as growth_rate
          FROM revenue_data
        )
        SELECT AVG(growth_rate)::numeric FROM revenue_growth_rates WHERE growth_rate IS NOT NULL
      ) as revenue_avg_growth_rate,
      -- 평균 EPS 성장률
      (
        WITH income_data AS (
          SELECT eps_diluted::numeric as eps, period_end_date, ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
          FROM quarterly_financials
          WHERE symbol = cand.symbol AND eps_diluted IS NOT NULL
          ORDER BY period_end_date DESC
          LIMIT ${incomeGrowthQuarters}
        ),
        income_growth_rates AS (
          SELECT eps, LAG(eps) OVER (ORDER BY period_end_date ASC) as prev_eps,
            CASE 
              WHEN LAG(eps) OVER (ORDER BY period_end_date ASC) = 0 THEN NULL
              WHEN LAG(eps) OVER (ORDER BY period_end_date ASC) IS NULL THEN NULL
              ELSE ((eps - LAG(eps) OVER (ORDER BY period_end_date ASC)) / NULLIF(LAG(eps) OVER (ORDER BY period_end_date ASC), 0)) * 100
            END as growth_rate
          FROM income_data
        )
        SELECT AVG(growth_rate)::numeric FROM income_growth_rates WHERE growth_rate IS NOT NULL
      ) as income_avg_growth_rate
    FROM (
      SELECT period_end_date, revenue, net_income, eps_diluted, ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
      FROM quarterly_financials
      WHERE symbol = cand.symbol
      ORDER BY period_end_date DESC
      LIMIT 8
    ) recent_quarters
  `;
}

/**
 * 밸류에이션 서브쿼리 생성
 */
function buildValuationCTE(): SQL {
  return sql`
    SELECT 
      COALESCE(dr.pe_ratio, qr.pe_ratio)::numeric as pe_ratio,
      COALESCE(dr.peg_ratio, qr.peg_ratio)::numeric as peg_ratio
    FROM (SELECT 1) dummy
    LEFT JOIN LATERAL (
      SELECT pe_ratio, peg_ratio
      FROM daily_ratios
      WHERE symbol = cand.symbol AND date::date = cand.d
      LIMIT 1
    ) dr ON true
    LEFT JOIN LATERAL (
      SELECT pe_ratio, peg_ratio
      FROM quarterly_ratios
      WHERE symbol = cand.symbol
      ORDER BY period_end_date DESC
      LIMIT 1
    ) qr ON true
  `;
}

/**
 * WHERE 절 필터 조건 생성
 */
function buildWhereFilters(params: ScreenerParams): SQL {
  const {
    justTurned = false,
    ordered = false, // URL 파라미터에 명시적으로 값이 있어야만 적용
    profitability = "all",
    turnAround = false,
    revenueGrowth = false,
    incomeGrowth = false,
    revenueGrowthQuarters = 3,
    incomeGrowthQuarters = 3,
    revenueGrowthRate = null,
    incomeGrowthRate = null,
    pegFilter = false,
    ma20Above = false, // URL 파라미터에 명시적으로 값이 있어야만 적용
    ma50Above = false, // URL 파라미터에 명시적으로 값이 있어야만 적용
    ma100Above = false, // URL 파라미터에 명시적으로 값이 있어야만 적용
    ma200Above = false, // URL 파라미터에 명시적으로 값이 있어야만 적용
  } = params;

  return sql`
    WHERE 1=1
    ${
      justTurned && ordered
        ? sql`AND COALESCE(ps.non_ordered_days_count, 0) > 0`
        : sql``
    }
    ${
      profitability === "profitable"
        ? sql`AND qf.eps_q1 IS NOT NULL AND qf.eps_q1 > 0`
        : sql``
    }
    ${
      profitability === "unprofitable"
        ? sql`AND qf.eps_q1 IS NOT NULL AND qf.eps_q1 < 0`
        : sql``
    }
    ${turnAround ? sql`AND qf.turned_profitable IS TRUE` : sql``}
    ${
      revenueGrowth && revenueGrowthRate !== null
        ? sql`AND qf.revenue_growth_quarters >= ${revenueGrowthQuarters} AND qf.revenue_avg_growth_rate IS NOT NULL AND qf.revenue_avg_growth_rate >= ${revenueGrowthRate}`
        : revenueGrowth
          ? sql`AND qf.revenue_growth_quarters >= ${revenueGrowthQuarters}`
          : sql``
    }
    ${
      incomeGrowth && incomeGrowthRate !== null
        ? sql`AND qf.income_growth_quarters >= ${incomeGrowthQuarters} AND qf.income_avg_growth_rate IS NOT NULL AND qf.income_avg_growth_rate >= ${incomeGrowthRate}`
        : incomeGrowth
          ? sql`AND qf.income_growth_quarters >= ${incomeGrowthQuarters}`
          : sql``
    }
    ${
      pegFilter
        ? sql`AND qr.peg_ratio IS NOT NULL AND qr.peg_ratio::numeric >= 0 AND qr.peg_ratio::numeric < 1`
        : sql``
    }
    ${
      ma20Above
        ? sql`AND cand.close IS NOT NULL AND cand.ma20 IS NOT NULL AND cand.close > cand.ma20`
        : sql``
    }
    ${
      ma50Above
        ? sql`AND cand.close IS NOT NULL AND cand.ma50 IS NOT NULL AND cand.close > cand.ma50`
        : sql``
    }
    ${
      ma100Above
        ? sql`AND cand.close IS NOT NULL AND cand.ma100 IS NOT NULL AND cand.close > cand.ma100`
        : sql``
    }
    ${
      ma200Above
        ? sql`AND cand.close IS NOT NULL AND cand.ma200 IS NOT NULL AND cand.close > cand.ma200`
        : sql``
    }
  `;
}

/**
 * 전체 스크리너 쿼리 빌드
 */
export function buildScreenerQuery(params: ScreenerParams): SQL {
  const {
    ordered = false, // URL 파라미터에 명시적으로 값이 있어야만 적용
    justTurned = false,
    lookbackDays = FILTER_DEFAULTS.LOOKBACK_DAYS, // lookbackDays는 justTurned가 true일 때만 사용되므로 기본값 유지
    revenueGrowthQuarters = FILTER_DEFAULTS.REVENUE_GROWTH_QUARTERS,
    incomeGrowthQuarters = FILTER_DEFAULTS.INCOME_GROWTH_QUARTERS,
  } = params;

  // requireMA: MA 데이터가 필요한 필터가 하나라도 켜져 있으면 true
  // ordered와 goldenCross는 명시적으로 true일 때만 포함
  const requireMA = requiresMA(params);
  const maxRn = QUERY_CONSTANTS.MAX_RN_OFFSET + lookbackDays;
  const needPrevStatus = justTurned && ordered === true;

  // justTurned 필터가 필요할 때만 prev_ma와 prev_status CTE 포함
  if (needPrevStatus) {
    return sql`
    WITH last_d AS (
      ${buildLastDateCTE(requireMA)}
    ),
    cur AS (
      ${buildCurrentDataCTE(params, requireMA)}
    ),
    candidates AS (
      ${buildCandidatesCTE(params)}
    ),
    prev_ma AS (
      ${buildPrevMACTE()}
    ),
    prev_status AS (
      ${buildPrevStatusCTE(maxRn)}
    )
    SELECT
      cand.symbol,
      cand.d AS trade_date,
      cand.close AS last_close,
      cand.rs_score AS rs_score,
      s.market_cap,
      s.sector,
      qf.quarterly_data,
      qf.eps_q1 AS latest_eps,
      qf.eps_prev AS prev_eps,
      qf.turned_profitable,
      qf.revenue_growth_quarters,
      qf.income_growth_quarters,
      qf.revenue_avg_growth_rate,
      qf.income_avg_growth_rate,
      qr.pe_ratio,
        qr.peg_ratio,
        CASE 
          WHEN cand.ma20 IS NOT NULL AND cand.ma50 IS NOT NULL AND cand.ma100 IS NOT NULL AND cand.ma200 IS NOT NULL
            THEN (cand.ma20 > cand.ma50 AND cand.ma50 > cand.ma100 AND cand.ma100 > cand.ma200)
          ELSE NULL
        END AS ordered
      FROM candidates cand
      LEFT JOIN prev_status ps ON ps.symbol = cand.symbol
      LEFT JOIN symbols s ON s.symbol = cand.symbol
      LEFT JOIN LATERAL (
        ${buildQuarterlyFinancialsCTE(
          revenueGrowthQuarters,
          incomeGrowthQuarters
        )}
      ) qf ON true
      LEFT JOIN LATERAL (
        ${buildValuationCTE()}
      ) qr ON true
      ${buildWhereFilters(params)}
      ORDER BY s.market_cap DESC NULLS LAST, cand.symbol ASC
    `;
  }

  // justTurned 필터가 필요 없을 때는 prev_ma와 prev_status CTE 제외
  return sql`
    WITH last_d AS (
      ${buildLastDateCTE(requireMA)}
    ),
    cur AS (
      ${buildCurrentDataCTE(params, requireMA)}
    ),
    candidates AS (
      ${buildCandidatesCTE(params)}
    )
    SELECT
      cand.symbol,
      cand.d AS trade_date,
      cand.close AS last_close,
      cand.rs_score AS rs_score,
      s.market_cap,
      s.sector,
      qf.quarterly_data,
      qf.eps_q1 AS latest_eps,
      qf.eps_prev AS prev_eps,
      qf.turned_profitable,
      qf.revenue_growth_quarters,
      qf.income_growth_quarters,
      qf.revenue_avg_growth_rate,
      qf.income_avg_growth_rate,
      qr.pe_ratio,
      qr.peg_ratio,
      CASE 
        WHEN cand.ma20 IS NOT NULL AND cand.ma50 IS NOT NULL AND cand.ma100 IS NOT NULL AND cand.ma200 IS NOT NULL
          THEN (cand.ma20 > cand.ma50 AND cand.ma50 > cand.ma100 AND cand.ma100 > cand.ma200)
        ELSE NULL
      END AS ordered
    FROM candidates cand
    LEFT JOIN symbols s ON s.symbol = cand.symbol
    LEFT JOIN LATERAL (
      ${buildQuarterlyFinancialsCTE(
        revenueGrowthQuarters,
        incomeGrowthQuarters
      )}
    ) qf ON true
    LEFT JOIN LATERAL (
      ${buildValuationCTE()}
    ) qr ON true
    ${buildWhereFilters(params)}
    ORDER BY s.market_cap DESC NULLS LAST, cand.symbol ASC
  `;
}
