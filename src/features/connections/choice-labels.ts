import { useTranslation } from "react-i18next";

import { choices, isKnownChoice, type Choice } from "../../lib/csv-mapping";

/** A message key for each value the editor offers by name (`choices` in lib/csv-mapping). */
const labelKeys = {
  encoding: {
    UTF_8: "choices.encoding.utf8",
    WINDOWS_1252: "choices.encoding.windows1252",
    UTF_16: "choices.encoding.utf16",
  },
  delimiter: {
    ";": "choices.delimiter.semicolon",
    ",": "choices.delimiter.comma",
    "\t": "choices.delimiter.tab",
    "|": "choices.delimiter.pipe",
  },
  decimal_separator: { ".": "choices.decimal.point", ",": "choices.decimal.comma" },
  thousands_separator: {
    "": "choices.thousands.none",
    ".": "choices.thousands.point",
    ",": "choices.thousands.comma",
    " ": "choices.thousands.space",
    "'": "choices.thousands.apostrophe",
  },
  amount_layout: { SIGNED: "choices.layout.signed", DEBIT_CREDIT: "choices.layout.debitCredit" },
  positive_amount_means: {
    MONEY_IN: "choices.positive.moneyIn",
    MONEY_OUT: "choices.positive.moneyOut",
  },
} as const satisfies {
  [C in Exclude<Choice, "date_format">]: Record<(typeof choices)[C][number], string>;
};

type LabelKey = {
  [C in keyof typeof labelKeys]: (typeof labelKeys)[C][keyof (typeof labelKeys)[C]];
}[keyof typeof labelKeys];

/** 31 January 2026 written in a date format: "31.01.2026" for `DD.MM.YYYY`. */
export function dateExample(format: string): string {
  return format.replace("YYYY", "2026").replace("YY", "26").replace("MM", "01").replace("DD", "31");
}

/**
 * A choice's label: its words from the message file, a date format with an
 * example, or, for a value this UI doesn't know, the value as saved.
 */
export function useChoiceLabel(): (choice: Choice, value: string) => string {
  const { t } = useTranslation("connections");
  return (choice, value) => {
    if (!isKnownChoice(choice, value)) {
      return value;
    }
    if (choice === "date_format") {
      return t("choices.dateFormat", { example: dateExample(value), format: value });
    }
    return t((labelKeys[choice] as Record<string, LabelKey>)[value] ?? "choices.dateFormat");
  };
}

/** The values a choice offers: its known ones, plus the current value if the UI doesn't know it. */
export function choiceValues(choice: Choice, current: string): string[] {
  const known: readonly string[] = choices[choice];
  return known.includes(current) || current === "" ? [...known] : [...known, current];
}
