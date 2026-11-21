// Search parameters several screens share, validated where each route declares them.
import { z } from "zod";

import type { MonthChoice } from "./month";

/**
 * `booking_month`: a month (`2026-03`) or `all`, kept when switching between To
 * review and Transactions. Anything else is dropped.
 */
export const bookingMonthSearch = z.object({
  booking_month: z
    .string()
    .regex(/^(\d{4}-(0[1-9]|1[0-2])|all)$/)
    // The pattern is exactly a MonthChoice.
    .transform((month) => month as MonthChoice)
    .optional()
    .catch(undefined),
});

/** The Transactions tab: the month, and `uncategorised=true` for its Uncategorised rows only. */
export const transactionsSearch = bookingMonthSearch.extend({
  uncategorised: z.literal(true).optional().catch(undefined),
});
