import { z } from "zod";
import { ALERT_TYPES } from "./constants";

/**
 * 알림 API 쿼리 파라미터 검증 스키마
 */
export const alertsQuerySchema = z.object({
  alertType: z
    .string()
    .nullable()
    .transform((val) => val ?? ALERT_TYPES.MA20_BREAKOUT_ORDERED)
    .refine(
      (val) => Object.values(ALERT_TYPES).includes(val as any),
      "Invalid alert type"
    ),
  maxDates: z
    .string()
    .nullable()
    .transform((val) => (val ? parseInt(val, 10) : 5))
    .pipe(z.number().int().min(1).max(100)),
});

export type AlertsQueryParams = z.infer<typeof alertsQuerySchema>;
