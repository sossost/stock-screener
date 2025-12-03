export const ALERT_TYPES = {
  MA20_BREAKOUT_ORDERED: "ma20_breakout_ordered",
} as const;

export type AlertType = (typeof ALERT_TYPES)[keyof typeof ALERT_TYPES];

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  [ALERT_TYPES.MA20_BREAKOUT_ORDERED]: "20일선 돌파 (정배열)",
};

export const ALERT_TYPE_DESCRIPTIONS: Record<AlertType, string> = {
  [ALERT_TYPES.MA20_BREAKOUT_ORDERED]:
    "정배열 상태에서 20일 이동평균선을 돌파한 종목",
};

export const ALERT_CHANNELS = {
  EMAIL: "email",
  PUSH: "push",
} as const;
