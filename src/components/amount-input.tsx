import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatDecimal, parseAmountInput, type Decimal } from "../lib/money";

interface AmountInputProps {
  /** What the amount is, such as "Export balance"; the currency is added to it. */
  label: string;
  currency: string;
  /** The currency's decimal places, from `GET /currencies`. */
  decimalPlaces: number;
  /** The amount as canonical decimal text, or null when the field holds none. */
  value: Decimal | null;
  /** Called with the amount whenever the text reads as one, else with null. */
  onValueChange: (value: Decimal | null) => void;
  /** An error from the form, such as "Required"; the field's own errors come first. */
  error?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** For tests; the User's locale otherwise. */
  locale?: string;
}

/**
 * The amount input (spec, "Money" and "Accessibility"): a text field, never
 * `type="number"`, that reads the locale's separators and a typed minus, refuses
 * more decimal places than the currency has, and keeps exact decimal text. It
 * formats only when it loses focus, so the caret never moves while typing.
 */
export function AmountInput({
  label,
  currency,
  decimalPlaces,
  value,
  onValueChange,
  error,
  name,
  required,
  disabled,
  locale,
}: AmountInputProps) {
  const { t } = useTranslation();
  const id = useId();
  const errorId = `${id}-error`;
  const [text, setText] = useState(() => (value === null ? "" : formatDecimal(value, locale)));
  const [touched, setTouched] = useState(false);
  // The value the text last stood for: when the form changes `value` itself
  // (a reset), the text follows.
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    const parsed = parseAmountInput(text, decimalPlaces, locale);
    if (parsed.kind !== "ok" || parsed.amount !== value) {
      setText(value === null ? "" : formatDecimal(value, locale));
    }
  }

  const parsed = parseAmountInput(text, decimalPlaces, locale);
  let ownError: string | undefined;
  if (parsed.kind === "too-many-places") {
    ownError = t("amountInput.tooManyPlaces", { count: parsed.places, currency });
  } else if (parsed.kind === "invalid" && touched) {
    const example = formatDecimal(
      decimalPlaces > 0 ? (`1234.${"5".repeat(decimalPlaces)}` as Decimal) : "1234",
      locale,
    );
    ownError = t("amountInput.invalid", { example });
  }
  const shownError = ownError ?? error;

  return (
    <div>
      <label htmlFor={id}>{t("amountInput.label", { label, currency })}</label>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        required={required}
        disabled={disabled}
        value={text}
        aria-invalid={shownError !== undefined}
        aria-describedby={shownError === undefined ? undefined : errorId}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const read = parseAmountInput(next, decimalPlaces, locale);
          const amount = read.kind === "ok" ? read.amount : null;
          setShown(amount);
          onValueChange(amount);
        }}
        onBlur={() => {
          setTouched(true);
          if (parsed.kind === "ok") {
            setText(formatDecimal(parsed.amount, locale));
          }
        }}
      />
      {shownError !== undefined && <p id={errorId}>{shownError}</p>}
    </div>
  );
}
