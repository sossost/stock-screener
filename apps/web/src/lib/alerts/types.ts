import type { AlertType } from "./constants";

export interface AlertData {
  symbol: string;
  companyName: string;
  sector: string | null;
  marketCap: number | null;
  alertType: AlertType;
  todayClose: number;
  todayMa20: number;
  todayMa50: number;
  todayMa100: number;
  todayMa200: number;
  prevClose: number;
  prevMa20: number;
  todayVolume: number;
  prevVolume: number;
  breakoutPercent: number; // (todayClose / prevMa20 - 1) * 100
  priceChangePercent: number; // (todayClose / prevClose - 1) * 100
  volumeChangePercent: number; // (todayVolume / prevVolume - 1) * 100
  date: string; // 'YYYY-MM-DD'
}
