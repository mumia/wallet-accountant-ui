// Transfers between a Household's Accounts (cash-accounts-and-transfers spec,
// "Transfer legs in Transactions"): how a leg and a Transfer choice are named.
import type { TFunction } from "i18next";

import type { components } from "../api/schema.gen";
import { isCash } from "./account-query";
import type { AmountSign } from "./categories";

type AccountKind = components["schemas"]["AccountKind"];

/** A Transfer leg, recognised by its Counterpart Account. */
export function isTransferLeg(transaction: { counterpart_account_id?: string | undefined }) {
  return transaction.counterpart_account_id !== undefined;
}

/**
 * A leg In transit: not Matched to the other leg yet, and not reversed, as the
 * backend's `in_transit` filter counts it.
 */
export function isInTransit(transaction: {
  counterpart_account_id?: string | undefined;
  match_id?: string | undefined;
  reversal_of_transaction_id?: string | undefined;
  reversed_by_transaction_id?: string | undefined;
}) {
  return (
    isTransferLeg(transaction) &&
    transaction.match_id === undefined &&
    transaction.reversal_of_transaction_id === undefined &&
    transaction.reversed_by_transaction_id === undefined
  );
}

/**
 * Which way a Transfer goes, by the sign of the amount on this Account: money
 * out goes "to" the Counterpart, money in comes "from" it. No sign yet names
 * neither.
 */
export function transferWay(sign: AmountSign | undefined): "to" | "from" | "either" {
  switch (sign) {
    case "out":
      return "to";
    case "in":
      return "from";
    default:
      return "either";
  }
}

/** "Transfer to Bank", "Transfer from Bank", or "Transfer · Bank" with no sign. */
export function transferLabel(t: TFunction, sign: AmountSign | undefined, account: string): string {
  return t(`transfer.${transferWay(sign)}`, { account });
}

/**
 * What reversing a Transaction does to the other leg of its Transfer
 * (cash-accounts-and-transfers spec, "Reversing legs"), as the reverse dialog
 * warns of it:
 *
 * - `bankLeg`: a statement Account's leg; its row goes back to To review, and
 *   the cash leg is reversed too or left In transit;
 * - `cashLeg`: a cash leg Matched to a statement Account's, which stays;
 * - `both`: either leg of a cash ↔ cash Transfer, both reversed;
 * - `none`: not a Matched leg (In transit or no leg at all), or the
 *   Counterpart isn't known yet.
 */
export type ReverseWarning =
  { kind: "none" } | { kind: "bankLeg" | "cashLeg" | "both"; counterpart: string };

export function reverseWarning(
  leg: { counterpart_account_id?: string | undefined; match_id?: string | undefined },
  account: { kind: AccountKind },
  counterpart: { kind: AccountKind; name: string } | undefined,
): ReverseWarning {
  if (!isTransferLeg(leg) || leg.match_id === undefined || counterpart === undefined) {
    return { kind: "none" };
  }
  if (!isCash(account)) {
    return { kind: "bankLeg", counterpart: counterpart.name };
  }
  return { kind: isCash(counterpart) ? "both" : "cashLeg", counterpart: counterpart.name };
}
