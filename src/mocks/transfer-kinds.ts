// The backend's kind rule for Transfers (statement-transfers spec, "The
// counterpart check"; backend v0.11.0): a Transfer leg's Account and its
// counterpart must each be cash, bank or credit card. Kept apart from the
// UI's own `takesPartInTransfers`, so the mock refuses what the backend
// refuses even if the UI's filtering is wrong.
import type { components } from "../api/schema.gen";

type Account = components["schemas"]["Account"];

const inTransfers: ReadonlySet<string> = new Set(["CASH", "BANK_ACCOUNT", "CREDIT_CARD"]);

/**
 * The Account a Transfer between `own` and `counterpart` is refused for
 * (`ACCOUNT_KIND_NOT_SUPPORTED`), the leg's own Account checked first; or
 * undefined when both take part. `counterpart` may be left out to check only
 * `own`.
 */
export function kindRefusedFor(own: Account, counterpart?: Account): Account | undefined {
  return [own, counterpart].find(
    (account): account is Account => account !== undefined && !inTransfers.has(account.kind),
  );
}

export const accountKindDetail =
  "Loan and crypto wallet Accounts take no part in Transfers yet: only cash, bank and credit card Accounts do.";
