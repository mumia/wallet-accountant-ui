// Transfers between a Household's Accounts (cash-accounts-and-transfers spec,
// "Transfer legs in Transactions"): how a leg and a Transfer choice are named.
import type { TFunction } from "i18next";

import type { AmountSign } from "./categories";

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
