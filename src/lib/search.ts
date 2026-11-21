// Search parameters several screens share, validated where each route declares them.
import { z } from "zod";

/**
 * `booking_month`: a month (`2026-03`) or `all`, kept when switching between To
 * review and Transactions. Anything else is dropped.
 */
export const bookingMonthSearch = z.object({
  booking_month: z
    .string()
    .regex(/^(\d{4}-(0[1-9]|1[0-2])|all)$/)
    .optional()
    .catch(undefined),
});
