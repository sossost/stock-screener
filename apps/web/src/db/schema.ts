import {
  pgTable,
  text,
  numeric,
  timestamp,
  unique,
  index,
  boolean,
  serial,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const symbols = pgTable("symbols", {
  symbol: text("symbol").primaryKey(),
  companyName: text("company_name"),
  marketCap: numeric("market_cap"),
  sector: text("sector"),
  industry: text("industry"),
  beta: numeric("beta"),
  price: numeric("price"),
  lastAnnualDividend: numeric("last_annual_dividend"),
  volume: numeric("volume"),
  exchange: text("exchange"),
  exchangeShortName: text("exchange_short_name"),
  country: text("country"),
  isEtf: boolean("is_etf").default(false),
  isFund: boolean("is_fund").default(false),
  isActivelyTrading: boolean("is_actively_trading").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const quarterlyFinancials = pgTable(
  "quarterly_financials",
  {
    // FK: 심볼
    symbol: text("symbol")
      .notNull()
      .references(() => symbols.symbol, { onDelete: "cascade" }),

    // 분기 말일(ISO, ex: 2024-12-31)
    periodEndDate: text("period_end_date").notNull(),

    // 2024Q4 같은 레이블 (정렬용으로 raw date도 같이 저장)
    asOfQ: text("as_of_q").notNull(),

    // 손익계산서
    revenue: numeric("revenue"),
    netIncome: numeric("net_income"),
    operatingIncome: numeric("operating_income"),
    ebitda: numeric("ebitda"),
    grossProfit: numeric("gross_profit"),

    // 현금흐름표
    operatingCashFlow: numeric("operating_cash_flow"),
    freeCashFlow: numeric("free_cash_flow"),

    // EPS
    epsDiluted: numeric("eps_diluted"),
    epsBasic: numeric("eps_basic"), // 소스 없으면 NULL

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // 같은 심볼/분기 중복 방지
    uq: unique("uq_quarterly_financials_symbol_period").on(
      t.symbol,
      t.periodEndDate
    ),
    // 조회 최적화
    idx_symbol_q: index("idx_quarterly_financials_symbol_q").on(
      t.symbol,
      t.asOfQ
    ),
  })
);

export const quarterlyRatios = pgTable(
  "quarterly_ratios",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => symbols.symbol, { onDelete: "cascade" }),
    periodEndDate: text("period_end_date").notNull(),
    asOfQ: text("as_of_q").notNull(),

    // Valuation
    peRatio: numeric("pe_ratio"),
    pegRatio: numeric("peg_ratio"),
    fwdPegRatio: numeric("fwd_peg_ratio"),
    psRatio: numeric("ps_ratio"),
    pbRatio: numeric("pb_ratio"),
    evEbitda: numeric("ev_ebitda"),

    // Profitability
    grossMargin: numeric("gross_margin"),
    opMargin: numeric("op_margin"),
    netMargin: numeric("net_margin"),

    // Leverage
    debtEquity: numeric("debt_equity"),
    debtAssets: numeric("debt_assets"),
    debtMktCap: numeric("debt_mkt_cap"),
    intCoverage: numeric("int_coverage"),

    // Cash flow
    pOCFRatio: numeric("p_ocf_ratio"),
    pFCFRatio: numeric("p_fcf_ratio"),
    ocfRatio: numeric("ocf_ratio"),
    fcfPerShare: numeric("fcf_per_share"),

    // Dividend
    divYield: numeric("div_yield"),
    payoutRatio: numeric("payout_ratio"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uq: unique("uq_quarterly_ratios_symbol_period").on(
      t.symbol,
      t.periodEndDate
    ),
  })
);

export const dailyPrices = pgTable(
  "daily_prices",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => symbols.symbol, { onDelete: "cascade" }),
    date: text("date").notNull(), // 'YYYY-MM-DD'
    open: numeric("open"),
    high: numeric("high"),
    low: numeric("low"),
    close: numeric("close"),
    adjClose: numeric("adj_close"),
    volume: numeric("volume"),
    rsScore: integer("rs_score"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uq: unique("uq_daily_prices_symbol_date").on(t.symbol, t.date),
    idx_sym_date: index("idx_daily_prices_symbol_date").on(t.symbol, t.date),
  })
);

export const dailyMa = pgTable(
  "daily_ma",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => symbols.symbol, { onDelete: "cascade" }),
    date: text("date").notNull(),

    ma20: numeric("ma20"),
    ma50: numeric("ma50"),
    ma100: numeric("ma100"),
    ma200: numeric("ma200"),
    volMa30: numeric("vol_ma30"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uq: unique("uq_daily_ma_symbol_date").on(t.symbol, t.date),
    idx_sym_date: index("idx_daily_ma_symbol_date").on(t.symbol, t.date),
  })
);

export const dailyRatios = pgTable(
  "daily_ratios",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => symbols.symbol, { onDelete: "cascade" }),
    date: text("date").notNull(), // 'YYYY-MM-DD'

    // Valuation (종가 기준 매일 계산)
    peRatio: numeric("pe_ratio"), // 현재가 / EPS(TTM)
    psRatio: numeric("ps_ratio"), // 시가총액 / 연간매출(TTM)
    pbRatio: numeric("pb_ratio"), // 시가총액 / 자기자본
    pegRatio: numeric("peg_ratio"), // P/E / EPS 성장률
    evEbitda: numeric("ev_ebitda"), // EV / EBITDA(TTM)

    // 계산에 사용된 값 (디버깅/검증용)
    marketCap: numeric("market_cap"), // 해당일 시가총액
    epsTtm: numeric("eps_ttm"), // 최근 4분기 EPS 합계
    revenueTtm: numeric("revenue_ttm"), // 최근 4분기 매출 합계

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    uq: unique("uq_daily_ratios_symbol_date").on(t.symbol, t.date),
    idx_sym_date: index("idx_daily_ratios_symbol_date").on(t.symbol, t.date),
  })
);

export const watchlist = pgTable(
  "watchlist",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    symbol: text("symbol")
      .notNull()
      .references(() => symbols.symbol, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uq: unique("uq_watchlist_user_symbol").on(t.userId, t.symbol),
    idx_user: index("idx_watchlist_user").on(t.userId),
  })
);

// ==================== 매매일지 (Trading Journal) ====================

/**
 * 전략 태그 (미리 정의된 값)
 */
export const STRATEGY_TAGS = [
  "눌림목",
  "돌파",
  "역추세",
  "실적발표",
  "뇌동매매",
  "기타",
] as const;

/**
 * 실수 태그 (미리 정의된 값)
 */
export const MISTAKE_TAGS = [
  "원칙준수",
  "추격매수",
  "손절지연",
  "조급한익절",
  "포지션과다",
  "뇌동매매",
  "기타",
] as const;

/**
 * 매매 건 (에피소드)
 * - 한 종목을 사고 팔아서 완전히 끝날 때까지의 "하나의 에피소드"
 */
export const trades = pgTable(
  "trades",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().default("0"), // 0 = 관리자(나)

    symbol: text("symbol")
      .notNull()
      .references(() => symbols.symbol, { onDelete: "cascade" }),
    status: text("status").notNull().default("OPEN"), // OPEN | CLOSED

    // [Plan] 진입 시 작성
    strategy: text("strategy"), // 매매 기법
    planEntryPrice: numeric("plan_entry_price"), // 계획 진입가
    planStopLoss: numeric("plan_stop_loss"), // 최초 손절가 (R 계산용)
    planTargetPrice: numeric("plan_target_price"), // 1차 목표가 (하위호환)
    planTargets:
      jsonb("plan_targets").$type<{ price: number; weight: number }[]>(), // n차 목표가 [{price, weight}]
    entryReason: text("entry_reason"), // 진입 근거 (일기)
    commissionRate: numeric("commission_rate").default("0.07"), // 수수료율 (%, 기본 0.07%)

    // [Result] 청산 후 업데이트
    finalPnl: numeric("final_pnl"), // 최종 손익금 ($)
    finalRoi: numeric("final_roi"), // 최종 수익률 (소수점)
    finalRMultiple: numeric("final_r_multiple"), // R-Multiple

    // [Review] 복기
    mistakeType: text("mistake_type"), // 실수 태그
    reviewNote: text("review_note"), // 배운 점

    // Timestamps
    startDate: timestamp("start_date", { withTimezone: true }), // 첫 진입일
    endDate: timestamp("end_date", { withTimezone: true }), // 완전 청산일
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idx_user_status: index("idx_trades_user_status").on(t.userId, t.status),
    idx_user_symbol: index("idx_trades_user_symbol").on(t.userId, t.symbol),
    idx_start_date: index("idx_trades_start_date").on(t.startDate),
  })
);

/**
 * 매수/매도 내역
 * - 분할 매수/매도 지원
 */
export const tradeActions = pgTable(
  "trade_actions",
  {
    id: serial("id").primaryKey(),
    tradeId: integer("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),

    actionType: text("action_type").notNull(), // BUY | SELL
    actionDate: timestamp("action_date", { withTimezone: true })
      .notNull()
      .defaultNow(),

    price: numeric("price").notNull(), // 체결 가격
    quantity: integer("quantity").notNull(), // 수량

    note: text("note"), // 비고 (예: "2R 익절", "손절")

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idx_trade_id: index("idx_trade_actions_trade_id").on(t.tradeId),
    idx_action_date: index("idx_trade_actions_date").on(t.actionDate),
  })
);

// ==================== 자산 스냅샷 (Asset Snapshots) ====================

/**
 * 일별 자산 스냅샷
 * - 자산 흐름 그래프용 데이터
 */
export const assetSnapshots = pgTable(
  "asset_snapshots",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().default("0"),
    date: timestamp("date", { mode: "date" }).notNull(),
    totalAssets: numeric("total_assets").notNull(), // 총 자산 (현금 + 포지션)
    cash: numeric("cash").notNull(), // 현금
    positionValue: numeric("position_value").notNull(), // 포지션 가치
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uq_user_date: unique("uq_asset_snapshots_user_date").on(t.userId, t.date),
    idx_user_date: index("idx_asset_snapshots_user_date").on(t.userId, t.date),
  })
);

/**
 * 사용자 포트폴리오 설정
 * - 현금 보유량 등
 */
export const portfolioSettings = pgTable("portfolio_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique().default("0"),
  cashBalance: numeric("cash_balance").notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * 접근 코드 ↔ 사용자 ID 매핑 테이블
 * - 코드: 배포 전에 수동으로 등록
 * - userId: 각 코드에 대응되는 실제 사용자 ID
 */
export const accessCodes = pgTable("access_codes", {
  code: text("code").primaryKey(),
  userId: text("user_id").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ==================== 가격 알림 (Price Alerts) ====================

/**
 * 가격 알림 이력 테이블
 * - 돌파 감지 등 기술적 조건에 맞는 종목 알림 이력 저장
 */
export const priceAlerts = pgTable(
  "price_alerts",
  {
    id: serial("id").primaryKey(),
    symbol: text("symbol")
      .notNull()
      .references(() => symbols.symbol, { onDelete: "cascade" }),
    alertType: text("alert_type").notNull(), // 'ma20_breakout_ordered'
    alertDate: text("alert_date").notNull(), // 'YYYY-MM-DD'
    conditionData: jsonb("condition_data"), // AlertData 전체 정보를 JSONB로 저장
    notifiedAt: timestamp("notified_at", { withTimezone: true }).defaultNow(),
    notificationChannels: text("notification_channels").array(), // ['email', 'push']
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uq: unique("uq_price_alerts_symbol_type_date").on(
      t.symbol,
      t.alertType,
      t.alertDate
    ),
    idx_symbol_date: index("idx_price_alerts_symbol_date").on(
      t.symbol,
      t.alertDate
    ),
    idx_type_date: index("idx_price_alerts_type_date").on(
      t.alertType,
      t.alertDate
    ),
  })
);

// ==================== 푸시 알림 (Push Notifications) ====================

/**
 * 디바이스 토큰 테이블
 * - 모바일 앱 푸시 알림을 위한 디바이스 토큰 관리
 */
export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().default("0"), // 향후 사용자별 관리
    deviceId: text("device_id").notNull(),
    pushToken: text("push_token").notNull(),
    platform: text("platform").notNull(), // 'ios' | 'android'
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uq: unique("uq_device_tokens_device_id").on(t.deviceId),
    idx_user: index("idx_device_tokens_user_id").on(t.userId),
    idx_active: index("idx_device_tokens_active").on(t.isActive),
  })
);
