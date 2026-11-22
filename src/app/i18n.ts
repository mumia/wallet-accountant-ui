import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import common from "../locales/en/common.json";
import firstRun from "../locales/en/firstRun.json";
import months from "../locales/en/months.json";
import accounts from "../locales/en/accounts.json";
import categories from "../locales/en/categories.json";
import shell from "../locales/en/shell.json";
import statementImport from "../locales/en/statementImport.json";
import toReview from "../locales/en/toReview.json";
import transactions from "../locales/en/transactions.json";

/** The message files, by language and namespace. A new language is a new folder. */
export const resources = {
  en: {
    common,
    firstRun,
    shell,
    accounts,
    categories,
    transactions,
    statementImport,
    toReview,
    months,
  },
} as const;

export const defaultNS = "common";

export async function initI18n(): Promise<void> {
  await i18next.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    defaultNS,
    resources,
    // React escapes output already.
    interpolation: { escapeValue: false },
  });
}
