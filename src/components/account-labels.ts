import { useTranslation } from "react-i18next";

import type { components } from "../api/schema.gen";
import { formatMoney, type Money } from "../lib/money";

type AccountKind = components["schemas"]["AccountKind"];

/**
 * A label for each kind the contract lists today (its `x-extensible-enum`,
 * checked by account-labels.test.ts); it may grow.
 */
export const kindKeys = {
  BANK_ACCOUNT: "account.kinds.BANK_ACCOUNT",
  CREDIT_CARD: "account.kinds.CREDIT_CARD",
  LOAN: "account.kinds.LOAN",
  CRYPTO_WALLET: "account.kinds.CRYPTO_WALLET",
  CASH: "account.kinds.CASH",
} as const;

function isKnownKind(kind: string): kind is keyof typeof kindKeys {
  return Object.hasOwn(kindKeys, kind);
}

/**
 * How an Account is described in lists: its kind's label (or the raw kind when
 * the contract has grown one this UI doesn't know), and its balance or that it
 * awaits its first Statement import.
 */
export function useAccountLabels() {
  const { t } = useTranslation();
  return {
    kind: (kind: AccountKind) => (isKnownKind(kind) ? t(kindKeys[kind]) : kind),
    awaiting: t("account.awaiting"),
    balance: (account: { balance?: Money | undefined }) =>
      account.balance === undefined ? t("account.awaiting") : formatMoney(account.balance),
  };
}
