import { trades, tradeActions, STRATEGY_TAGS, MISTAKE_TAGS } from "@/db/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

// ==================== DB Model Types ====================

export type Trade = InferSelectModel<typeof trades>;
export type TradeInsert = InferInsertModel<typeof trades>;

export type TradeAction = InferSelectModel<typeof tradeActions>;
export type TradeActionInsert = InferInsertModel<typeof tradeActions>;

// ==================== Enum Types ====================

export type TradeStatus = "OPEN" | "CLOSED";
export type ActionType = "BUY" | "SELL";

export type StrategyTag = (typeof STRATEGY_TAGS)[number];
export type MistakeTag = (typeof MISTAKE_TAGS)[number];

/** n차 목표가 */
export interface PlanTarget {
  price: number;
  weight: number; // 퍼센트 (예: 50 = 50%)
}

// ==================== Computed Types ====================

/**
 * 계산된 매매 정보 (평단가, 보유수량 등)
 */
export interface TradeCalculated {
  /** 평균 진입가 (가중평균) */
  avgEntryPrice: number;
  /** 현재 보유 수량 */
  currentQuantity: number;
  /** 총 매수 금액 */
  totalBuyAmount: number;
  /** 총 매수 수량 */
  totalBuyQuantity: number;
  /** 총 매도 금액 */
  totalSellAmount: number;
  /** 총 매도 수량 */
  totalSellQuantity: number;
  /** 총 수수료 */
  totalCommission: number;
  /** 실현 손익 (매도 기준, 수수료 포함) */
  realizedPnl: number;
  /** 실현 수익률 */
  realizedRoi: number;
  /** R-Multiple (손절가 기준) */
  rMultiple: number | null;
  /** 평균 청산가 (CLOSED 거래용) */
  avgExitPrice: number;
}

/**
 * 매매 상세 정보 (DB 데이터 + 계산값 + 액션 목록)
 */
export interface TradeWithDetails extends Trade {
  actions: TradeAction[];
  calculated: TradeCalculated;
  symbolInfo?: {
    companyName: string | null;
    sector: string | null;
    currentPrice: number | null;
  };
}

/**
 * 매매 목록 아이템 (리스트용 간략 정보)
 */
export interface TradeListItem extends Trade {
  companyName: string | null;
  currentPrice: number | null;
  priceChangePercent: number | null; // 전일대비 변동률 (%)
  calculated: Pick<
    TradeCalculated,
    | "avgEntryPrice"
    | "currentQuantity"
    | "realizedPnl"
    | "realizedRoi"
    | "totalBuyQuantity"
    | "totalSellQuantity"
    | "avgExitPrice"
    | "totalCommission"
  > & {
    /** 보유 기간 (일수, CLOSED 거래용) */
    holdingDays?: number;
  };
}

// ==================== API Request/Response Types ====================

/**
 * 신규 매매 생성 요청
 */
export interface CreateTradeRequest {
  symbol: string;
  strategy?: StrategyTag;
  planEntryPrice?: number;
  planStopLoss?: number;
  planTargetPrice?: number; // 하위 호환용 (1차 목표가)
  planTargets?: PlanTarget[]; // n차 목표가 [{price, weight}]
  entryReason?: string;
  commissionRate?: number; // 수수료율 (%, 기본 0.07)
  /** 첫 매수 정보 (선택) */
  firstAction?: {
    price: number;
    quantity: number;
    actionDate?: string;
    note?: string;
  };
}

/**
 * 매매 수정 요청
 */
export interface UpdateTradeRequest {
  strategy?: StrategyTag;
  planEntryPrice?: number;
  planStopLoss?: number;
  planTargetPrice?: number;
  planTargets?: PlanTarget[];
  entryReason?: string;
  commissionRate?: number; // 수수료율 (%)
  mistakeType?: MistakeTag;
  reviewNote?: string;
}

/**
 * 매매 종료 요청
 */
export interface CloseTradeRequest {
  mistakeType?: MistakeTag;
  reviewNote?: string;
}

/**
 * 매수/매도 추가 요청
 */
export interface CreateActionRequest {
  actionType: ActionType;
  price: number;
  quantity: number;
  actionDate?: string;
  note?: string;
}

/**
 * 매매 목록 조회 필터
 */
export interface TradeListFilter {
  status?: TradeStatus;
  symbol?: string;
  startDate?: string;
  endDate?: string;
}

// ==================== Statistics Types ====================

/** 전략별 통계 */
export interface StrategyStats {
  strategy: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgR: number | null;
}

/**
 * 매매 통계
 */
export interface TradeStats {
  /** 총 매매 수 */
  totalTrades: number;
  /** 승리 매매 수 (PnL > 0) */
  winningTrades: number;
  /** 패배 매매 수 (PnL < 0) */
  losingTrades: number;
  /** 승률 (%) */
  winRate: number;
  /** 총 손익금 */
  totalPnl: number;
  /** 평균 R-Multiple */
  avgRMultiple: number | null;
  /** 최대 이익 */
  maxProfit: number;
  /** 최대 손실 */
  maxLoss: number;
  /** 실수 유형별 통계 */
  mistakeStats: Record<string, number>;
  /** 진행중 매매 수 */
  openTrades?: number;
  // Phase 3: 추가 통계
  /** Profit Factor (총 이익 / 총 손실) */
  profitFactor?: number | null;
  /** 평균 보유 기간 (일) */
  avgHoldingDays?: number | null;
  /** 최대 연승 */
  maxWinStreak?: number;
  /** 최대 연패 */
  maxLoseStreak?: number;
  /** 평균 승 금액 */
  avgWinAmount?: number;
  /** 평균 패 금액 */
  avgLossAmount?: number;
  /** 전략별 통계 */
  strategyStats?: StrategyStats[];
}
