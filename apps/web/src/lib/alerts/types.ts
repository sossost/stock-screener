import type { AlertType } from "./constants";

export interface AlertData {
  symbol: string;
  companyName: string;
  alertType: AlertType;
  todayClose: number;
  todayMa20: number;
  todayMa50: number;
  todayMa100: number;
  todayMa200: number;
  prevClose: number;
  prevMa20: number;
  breakoutPercent: number; // (todayClose / prevMa20 - 1) * 100
  date: string; // 'YYYY-MM-DD'
}

