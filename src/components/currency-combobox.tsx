import { useMemo, type Ref } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../api/context";
import { currencyName } from "../lib/currency";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "./ui/combobox";

interface CurrencyOption {
  code: string;
  /** "EUR — Euro", or just the code when Intl has no name for it. */
  label: string;
}

interface CurrencyComboboxProps {
  id: string;
  /** The currency code, or "" for none. */
  value: string;
  onValueChange: (code: string) => void;
  /**
   * What names it: a visible label's ID, or a name of its own .
   * A label's `htmlFor` alone isn't enough: while the list is open Base UI
   * hides the rest of the page, label included, and the input loses its name
   * (Base UI #6275); `aria-labelledby` still names it.
   */
  label: { id: string } | { text: string };
  onBlur?: () => void;
  name?: string;
  inputRef?: Ref<HTMLInputElement>;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string | undefined;
}

/**
 * A searchable choice of the currencies the backend knows (`GET /currencies`),
 * labelled "EUR — Euro". It is disabled until they have loaded; the form shows
 * a failure to load them.
 */
export function CurrencyCombobox({
  id,
  value,
  onValueChange,
  onBlur,
  name,
  inputRef,
  label,
  ...aria
}: CurrencyComboboxProps) {
  const { t } = useTranslation();
  const { api } = useApi();
  const currencies = api.useQuery("get", "/currencies");
  const options = useMemo(
    () =>
      (currencies.data?.items ?? []).map(({ code }): CurrencyOption => {
        const label = currencyName(code);
        return {
          code,
          label: label === undefined ? code : t("currencyLabel", { code, name: label }),
        };
      }),
    [currencies.data, t],
  );

  return (
    <Combobox
      disabled={!currencies.isSuccess}
      items={options}
      value={options.find(({ code }) => code === value) ?? null}
      onValueChange={(option: CurrencyOption | null) => {
        onValueChange(option?.code ?? "");
      }}
      itemToStringLabel={(option: CurrencyOption) => option.label}
      isItemEqualToValue={(a: CurrencyOption, b: CurrencyOption) => a.code === b.code}
    >
      <ComboboxInput
        id={id}
        ref={inputRef}
        name={name}
        onBlur={onBlur}
        placeholder={t("currencyCombobox.placeholder")}
        {...("id" in label ? { "aria-labelledby": label.id } : { "aria-label": label.text })}
        {...aria}
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("currencyCombobox.noMatch")}</ComboboxEmpty>
        <ComboboxList>
          {(option: CurrencyOption) => (
            <ComboboxItem key={option.code} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
