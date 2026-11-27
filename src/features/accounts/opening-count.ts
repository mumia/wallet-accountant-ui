// A cash Account's Opening count, typed twice (cash-accounts-and-transfers spec,
// "Add Account" and "Correct opening count…"): the form's own check, so a slip
// of the finger is caught before the server's `opening-count-mismatch`.
import type { TFunction } from "i18next";
import type { z } from "zod";

import type { Decimal } from "../../lib/money";

/** Both counts required, and the second the same as the first. */
export function checkOpeningCounts(
  t: TFunction<"accounts">,
  {
    openingCount,
    openingCountAgain,
  }: { openingCount: Decimal | null; openingCountAgain: Decimal | null },
  context: z.RefinementCtx,
) {
  if (openingCount === null) {
    context.addIssue({
      code: "custom",
      path: ["openingCount"],
      message: t("add.openingCountRequired"),
    });
  }
  if (openingCountAgain === null) {
    context.addIssue({
      code: "custom",
      path: ["openingCountAgain"],
      message: t("add.openingCountAgainRequired"),
    });
  } else if (openingCount !== null && openingCount !== openingCountAgain) {
    // Both are canonical decimal text in the currency's places, so equal counts read alike.
    context.addIssue({
      code: "custom",
      path: ["openingCountAgain"],
      message: t("add.openingCountsDiffer"),
    });
  }
}
