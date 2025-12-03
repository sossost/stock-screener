export const ALERT_TYPES = {
  MA20_BREAKOUT_ORDERED: "ma20_breakout_ordered",
} as const;

export type AlertType = typeof ALERT_TYPES[keyof typeof ALERT_TYPES];

export const ALERT_CHANNELS = {
  EMAIL: "email",
} as const;

