// 종목 상세 페이지 타입 정의

export interface StockBasicInfo {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  exchangeShortName: string | null;
  country: string | null;
  marketCap: string | null;
  beta: string | null;
  isEtf: boolean;
  isFund: boolean;
  isActivelyTrading: boolean;
}

export interface StockPriceInfo {
  lastClose: string | null;
  rsScore: number | null;
  volume: string | null;
  date: string | null;
}

export interface StockMAInfo {
  ma20: string | null;
  ma50: string | null;
  ma100: string | null;
  ma200: string | null;
  volMa30: string | null;
}

export interface StockMAStatus {
  /** MA20 > MA50 > MA100 > MA200 정배열 */
  ordered: boolean;
  /** MA50 > MA200 골든크로스 */
  goldenCross: boolean;
}

export interface StockDetail {
  basic: StockBasicInfo;
  price: StockPriceInfo;
  ma: StockMAInfo;
  maStatus: StockMAStatus;
}

export interface StockDetailResponse {
  data: StockDetail | null;
  error?: string;
}

