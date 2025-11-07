// app/api/screener/golden-cross/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { handleApiError, logError } from "@/lib/errors";

// 동적 라우트 강제 (쿼리 파라미터 사용)
export const dynamic = "force-dynamic";

// 캐싱 설정: 24시간 (종가 기준 데이터, 하루 1회 갱신)
// Next.js는 정적 분석을 위해 리터럴 값만 허용 (계산식/상수 참조 불가)
export const revalidate = 86400; // 1일 (60 * 60 * 24초)

export async function GET(req: Request) {
  try {
    // 환경변수 체크
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    if (!process.env.FMP_API_KEY) {
      throw new Error("FMP_API_KEY environment variable is not set");
    }

    const { searchParams } = new URL(req.url);

    const goldenCross = searchParams.get("goldenCross") !== "false"; // 기본값: true
    const justTurned = searchParams.get("justTurned") === "true";
    const lookbackDays = Number(searchParams.get("lookbackDays") ?? 10); // 기본 10일
    const maxRn = 1 + lookbackDays; // rn 범위 계산
    const minMcap = Number(searchParams.get("minMcap") ?? 0);
    const minPrice = Number(searchParams.get("minPrice") ?? 0);
    const minAvgVol = Number(searchParams.get("minAvgVol") ?? 0);
    const allowOTC = searchParams.get("allowOTC") === "true";
    const profitability = searchParams.get("profitability") ?? "all"; // 수익성 필터
    const revenueGrowth = searchParams.get("revenueGrowth") === "true"; // 매출 성장 필터 (boolean)
    const incomeGrowth = searchParams.get("incomeGrowth") === "true"; // 수익 성장 필터 (boolean)
    const revenueGrowthQuarters = Number(
      searchParams.get("revenueGrowthQuarters") ?? 3
    ); // 매출 성장 연속 분기 수
    const incomeGrowthQuarters = Number(
      searchParams.get("incomeGrowthQuarters") ?? 3
    ); // 수익 성장 연속 분기 수
    const revenueGrowthRateParam = searchParams.get("revenueGrowthRate");
    let revenueGrowthRate = null;
    if (revenueGrowthRateParam) {
      const parsed = Number(revenueGrowthRateParam);
      if (isNaN(parsed) || !isFinite(parsed)) {
        return NextResponse.json(
          { error: "revenueGrowthRate must be a valid number" },
          { status: 400 }
        );
      }
      revenueGrowthRate = parsed;
    }
    const incomeGrowthRateParam = searchParams.get("incomeGrowthRate");
    let incomeGrowthRate = null;
    if (incomeGrowthRateParam) {
      const parsed = Number(incomeGrowthRateParam);
      if (isNaN(parsed) || !isFinite(parsed)) {
        return NextResponse.json(
          { error: "incomeGrowthRate must be a valid number" },
          { status: 400 }
        );
      }
      incomeGrowthRate = parsed;
    }

    // 유효성 검사
    if (revenueGrowthQuarters < 2 || revenueGrowthQuarters > 8) {
      return NextResponse.json(
        { error: "revenueGrowthQuarters must be between 2 and 8" },
        { status: 400 }
      );
    }
    if (incomeGrowthQuarters < 2 || incomeGrowthQuarters > 8) {
      return NextResponse.json(
        { error: "incomeGrowthQuarters must be between 2 and 8" },
        { status: 400 }
      );
    }
    if (
      revenueGrowthRate !== null &&
      (revenueGrowthRate < 0 || revenueGrowthRate > 1000)
    ) {
      return NextResponse.json(
        { error: "revenueGrowthRate must be between 0 and 1000" },
        { status: 400 }
      );
    }
    if (
      incomeGrowthRate !== null &&
      (incomeGrowthRate < 0 || incomeGrowthRate > 1000)
    ) {
      return NextResponse.json(
        { error: "incomeGrowthRate must be between 0 and 1000" },
        { status: 400 }
      );
    }

    const rows = await db.execute(sql`
      WITH last_d AS (
        -- daily_ma와 daily_prices에 공통으로 존재하는 최신일 (NULL 방지: 둘 중 하나라도 NULL이면 전체가 비니 COALESCE로 안전장치)
        SELECT COALESCE(
          LEAST(
            (SELECT MAX(date)::date FROM daily_ma),
            (SELECT MAX(date)::date FROM daily_prices)
          ),
          (SELECT MAX(date)::date FROM daily_ma),
          (SELECT MAX(date)::date FROM daily_prices)
        ) AS d
      ),
      -- 1) 최신일 후보 추출 (Golden Cross 필터에 따라 정배열 조건 적용)
      cur AS (
        SELECT
          dm.symbol,
          dm.date::date AS d,
          dm.ma20, dm.ma50, dm.ma100, dm.ma200,
          dm.vol_ma30,
          pr.adj_close::numeric AS close
        FROM daily_ma dm
        JOIN last_d ld
          ON dm.date::date = ld.d
        LEFT JOIN daily_prices pr
          ON pr.symbol = dm.symbol AND pr.date::date = ld.d
        WHERE dm.ma20 IS NOT NULL AND dm.ma50 IS NOT NULL AND dm.ma100 IS NOT NULL AND dm.ma200 IS NOT NULL
          ${goldenCross ? sql`AND dm.ma20 > dm.ma50 AND dm.ma50 > dm.ma100 AND dm.ma100 > dm.ma200` : sql``}
          -- 정상적인 주식만 필터링 (워런트, 우선주, ETF 등 제외)
          AND dm.symbol ~ '^[A-Z]{1,5}$'
          AND dm.symbol NOT LIKE '%W'
          AND dm.symbol NOT LIKE '%X'
          AND dm.symbol NOT LIKE '%.%'
          AND dm.symbol NOT LIKE '%U'
          AND dm.symbol NOT LIKE '%WS'
      ),
      -- 2) 필수 컷(시총/가격/거래소/거래량) 먼저 가볍게 적용해서 "후보" 축소
      candidates AS (
        SELECT c.symbol, c.d, c.ma20, c.ma50, c.ma100, c.ma200, c.vol_ma30, c.close
        FROM cur c
        JOIN symbols s ON s.symbol = c.symbol
        WHERE
          (${minAvgVol} = 0 OR c.vol_ma30 IS NULL OR c.vol_ma30 >= ${minAvgVol})
          AND (${minPrice}  = 0 OR c.close     IS NULL OR c.close     >= ${minPrice})
          AND (${minMcap}   = 0 OR s.market_cap IS NULL OR s.market_cap::numeric >= ${minMcap})
          AND (${
            allowOTC
              ? sql`TRUE`
              : sql`(s.exchange NOT ILIKE 'OTC%' AND s.exchange NOT ILIKE 'PINK%')`
          })
      ),
      -- 3) 후보들에 한해 '전일(이전 영업일)' MA를 daily_prices에서 즉석 계산
      --   : 심볼/날짜 수가 적으니 여기선 윈도우 함수 써도 빠름
      prev_ma AS (
        SELECT
          b.symbol,
          b.d,
          -- 전일 기준의 MA들을 만들기 위해, rn=1(최신=ld.d), rn=2(전일<ld.d)를 같이 계산
          AVG(b.close) OVER (PARTITION BY b.symbol ORDER BY b.d ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)  AS ma20,
          AVG(b.close) OVER (PARTITION BY b.symbol ORDER BY b.d ROWS BETWEEN 49 PRECEDING AND CURRENT ROW)  AS ma50,
          AVG(b.close) OVER (PARTITION BY b.symbol ORDER BY b.d ROWS BETWEEN 99 PRECEDING AND CURRENT ROW)  AS ma100,
          AVG(b.close) OVER (PARTITION BY b.symbol ORDER BY b.d ROWS BETWEEN 199 PRECEDING AND CURRENT ROW) AS ma200,
          ROW_NUMBER()  OVER (PARTITION BY b.symbol ORDER BY b.d DESC) AS rn
        FROM (
          SELECT
            dp.symbol,
            dp.date::date AS d,
            dp.adj_close::numeric AS close
          FROM daily_prices dp
          JOIN last_d ld ON dp.date::date <= ld.d
          JOIN (SELECT DISTINCT symbol FROM candidates) cand ON cand.symbol = dp.symbol
          WHERE dp.date::date >= ( (SELECT d FROM last_d) - INTERVAL '220 day' )
        ) b
      ),
      -- 과거 lookbackDays일 범위에서 정배열이 아닌 날의 개수를 체크 (Golden Cross 필터가 활성화된 경우만)
      prev_status AS (
        SELECT 
          symbol,
          COUNT(*) FILTER (
            WHERE NOT (ma20 > ma50 AND ma50 > ma100 AND ma100 > ma200)
          ) AS non_ordered_days_count
        FROM prev_ma
        WHERE rn BETWEEN 2 AND ${maxRn}  -- 최근 N일
        GROUP BY symbol
      )
      SELECT
        cand.symbol,
        cand.d            AS trade_date,
        cand.close        AS last_close,
        s.market_cap,
        -- 재무 데이터 (최근 8개 분기)
        qf.quarterly_data,
        qf.eps_q1         AS latest_eps,
        -- 성장성 정보
        qf.revenue_growth_quarters,
        qf.income_growth_quarters,
        qf.revenue_avg_growth_rate,
        qf.income_avg_growth_rate
      FROM candidates cand
      LEFT JOIN prev_status ps ON ps.symbol = cand.symbol
      LEFT JOIN symbols s ON s.symbol = cand.symbol
      -- 최근 8개 분기 재무 데이터 JOIN
      LEFT JOIN LATERAL (
        SELECT
          json_agg(
            json_build_object(
              'period_end_date', period_end_date,
              'revenue', revenue::numeric,
              'eps_diluted', eps_diluted::numeric
            ) ORDER BY period_end_date DESC
          ) as quarterly_data,
          (
            SELECT eps_diluted::numeric
            FROM quarterly_financials
            WHERE symbol = cand.symbol
              AND eps_diluted IS NOT NULL
            ORDER BY period_end_date DESC
            LIMIT 1
          ) as eps_q1,
          -- 연속 매출 성장 분기 수 계산 (새로운 방법)
          (
            WITH revenue_data AS (
              SELECT 
                revenue::numeric as rev, 
                period_end_date,
                ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
              FROM quarterly_financials
              WHERE symbol = cand.symbol
                AND revenue IS NOT NULL
              ORDER BY period_end_date DESC
              LIMIT 8
            ),
            revenue_growth_check AS (
              SELECT 
                rev,
                LAG(rev) OVER (ORDER BY period_end_date ASC) as prev_rev,
                rn,
                CASE WHEN rev > LAG(rev) OVER (ORDER BY period_end_date ASC) THEN 1 ELSE 0 END as is_growth
              FROM revenue_data
            )
            SELECT COALESCE(
              (
                SELECT COUNT(*)
                FROM revenue_growth_check
                WHERE rn >= 1 
                  AND is_growth = 1
                  AND rn <= COALESCE(
                    (SELECT MIN(rn) FROM revenue_growth_check WHERE rn >= 1 AND is_growth = 0),
                    8
                  )
              ), 
              0
            )
          ) as revenue_growth_quarters,
          -- 연속 수익 성장 분기 수 계산
          (
            WITH income_data AS (
              SELECT 
                eps_diluted::numeric as eps, 
                period_end_date,
                ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
              FROM quarterly_financials
              WHERE symbol = cand.symbol
                AND eps_diluted IS NOT NULL
              ORDER BY period_end_date DESC
              LIMIT 8
            ),
            income_growth_check AS (
              SELECT 
                eps,
                LAG(eps) OVER (ORDER BY period_end_date ASC) as prev_eps,
                rn,
                CASE WHEN eps > LAG(eps) OVER (ORDER BY period_end_date ASC) THEN 1 ELSE 0 END as is_growth
              FROM income_data
            )
            SELECT COALESCE(
              (
                SELECT COUNT(*)
                FROM income_growth_check
                WHERE rn >= 1 
                  AND is_growth = 1
                  AND rn <= COALESCE(
                    (SELECT MIN(rn) FROM income_growth_check WHERE rn >= 1 AND is_growth = 0),
                    8
                  )
              ), 
              0
            )
          ) as income_growth_quarters,
          -- 평균 매출 성장률 계산 (N분기 동안 분기별 성장률의 평균)
          -- LAG 함수로 이전 분기와 비교하여 분기별 성장률 계산 후 AVG
          (
            WITH revenue_data AS (
              SELECT 
                revenue::numeric as rev, 
                period_end_date,
                ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
              FROM quarterly_financials
              WHERE symbol = cand.symbol
                AND revenue IS NOT NULL
              ORDER BY period_end_date DESC
              LIMIT ${revenueGrowthQuarters}
            ),
            revenue_growth_rates AS (
              SELECT 
                rev,
                LAG(rev) OVER (ORDER BY period_end_date ASC) as prev_rev,
                CASE 
                  WHEN LAG(rev) OVER (ORDER BY period_end_date ASC) = 0 THEN NULL
                  WHEN LAG(rev) OVER (ORDER BY period_end_date ASC) IS NULL THEN NULL
                  ELSE ((rev - LAG(rev) OVER (ORDER BY period_end_date ASC)) / 
                        NULLIF(LAG(rev) OVER (ORDER BY period_end_date ASC), 0)) * 100
                END as growth_rate
              FROM revenue_data
            )
            SELECT AVG(growth_rate)::numeric as avg_growth_rate
            FROM revenue_growth_rates
            WHERE growth_rate IS NOT NULL
          ) as revenue_avg_growth_rate,
          -- 평균 EPS 성장률 계산 (N분기 동안 분기별 성장률의 평균)
          -- LAG 함수로 이전 분기와 비교하여 분기별 성장률 계산 후 AVG
          (
            WITH income_data AS (
              SELECT 
                eps_diluted::numeric as eps, 
                period_end_date,
                ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
              FROM quarterly_financials
              WHERE symbol = cand.symbol
                AND eps_diluted IS NOT NULL
              ORDER BY period_end_date DESC
              LIMIT ${incomeGrowthQuarters}
            ),
            income_growth_rates AS (
              SELECT 
                eps,
                LAG(eps) OVER (ORDER BY period_end_date ASC) as prev_eps,
                CASE 
                  WHEN LAG(eps) OVER (ORDER BY period_end_date ASC) = 0 THEN NULL
                  WHEN LAG(eps) OVER (ORDER BY period_end_date ASC) IS NULL THEN NULL
                  ELSE ((eps - LAG(eps) OVER (ORDER BY period_end_date ASC)) / 
                        NULLIF(LAG(eps) OVER (ORDER BY period_end_date ASC), 0)) * 100
                END as growth_rate
              FROM income_data
            )
            SELECT AVG(growth_rate)::numeric as avg_growth_rate
            FROM income_growth_rates
            WHERE growth_rate IS NOT NULL
          ) as income_avg_growth_rate
        FROM (
          SELECT 
            period_end_date,
            revenue,
            eps_diluted,
            ROW_NUMBER() OVER (ORDER BY period_end_date DESC) as rn
          FROM quarterly_financials
          WHERE symbol = cand.symbol
          ORDER BY period_end_date DESC
          LIMIT 8
        ) recent_quarters
      ) qf ON true
      WHERE 1=1
        -- justTurned: 최근 lookbackDays일 이내에 정배열이 아닌 날이 하나라도 있어야 함 (Golden Cross 필터가 활성화된 경우만)
        ${
          justTurned && goldenCross
            ? sql`AND COALESCE(ps.non_ordered_days_count, 0) > 0`
            : sql``
        }
        -- 수익성 필터 (최근 분기 EPS 기준)
        ${
          profitability === "profitable"
            ? sql`AND qf.eps_q1 IS NOT NULL AND qf.eps_q1 > 0`
            : profitability === "unprofitable"
            ? sql`AND qf.eps_q1 IS NOT NULL AND qf.eps_q1 < 0`
            : sql``
        }
        -- 매출 성장성 필터 (연속 분기 수 + 평균 성장률)
        -- 연속 분기 수는 항상 체크하고, 성장률이 설정되어 있으면 추가로 평균 성장률도 체크
        ${
          revenueGrowth
            ? revenueGrowthRate !== null
              ? sql`AND qf.revenue_growth_quarters >= ${revenueGrowthQuarters} AND qf.revenue_avg_growth_rate IS NOT NULL AND qf.revenue_avg_growth_rate >= ${revenueGrowthRate}`
              : sql`AND qf.revenue_growth_quarters >= ${revenueGrowthQuarters}`
            : sql``
        }
        -- 수익 성장성 필터 (연속 분기 수 + 평균 성장률)
        -- 연속 분기 수는 항상 체크하고, 성장률이 설정되어 있으면 추가로 평균 성장률도 체크
        ${
          incomeGrowth
            ? incomeGrowthRate !== null
              ? sql`AND qf.income_growth_quarters >= ${incomeGrowthQuarters} AND qf.income_avg_growth_rate IS NOT NULL AND qf.income_avg_growth_rate >= ${incomeGrowthRate}`
              : sql`AND qf.income_growth_quarters >= ${incomeGrowthQuarters}`
            : sql``
        }
      ORDER BY s.market_cap DESC NULLS LAST, cand.symbol ASC;
    `);

    type QueryResult = {
      symbol: string;
      trade_date: string;
      last_close: number;
      market_cap: number | null;
      quarterly_data: any[] | null;
      latest_eps: number | null;
      revenue_growth_quarters: number | null;
      income_growth_quarters: number | null;
      revenue_avg_growth_rate: number | null;
      income_avg_growth_rate: number | null;
    };

    const results = rows.rows as QueryResult[];
    const tradeDate = results.length > 0 ? results[0].trade_date : null;

    const data = results.map((r) => ({
      symbol: r.symbol,
      market_cap: r.market_cap?.toString() || null,
      last_close: r.last_close.toString(),
      quarterly_financials: r.quarterly_data || [],
      profitability_status:
        r.latest_eps !== null && r.latest_eps > 0
          ? "profitable"
          : r.latest_eps !== null && r.latest_eps < 0
          ? "unprofitable"
          : "unknown",
      revenue_growth_quarters: r.revenue_growth_quarters || 0,
      income_growth_quarters: r.income_growth_quarters || 0,
      revenue_avg_growth_rate: r.revenue_avg_growth_rate,
      income_avg_growth_rate: r.income_avg_growth_rate,
      ordered: true,
      just_turned: justTurned,
    }));

    return NextResponse.json({
      count: data.length,
      trade_date: tradeDate,
      lookback_days: justTurned ? lookbackDays : null,
      data,
    });
  } catch (error) {
    logError(error, "Golden Cross API");
    const apiError = handleApiError(error);

    return NextResponse.json(
      {
        error: apiError.message,
        details: apiError.details,
      },
      { status: apiError.statusCode }
    );
  }
}
