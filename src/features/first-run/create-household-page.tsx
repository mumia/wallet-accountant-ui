import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useId, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useApi } from "../../api/context";
import { FormAlert } from "../../components/form-alert";
import { Button } from "../../components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "../../components/ui/combobox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { currencyName } from "../../lib/currency";
import { FirstRunCard } from "./first-run-card";

interface CurrencyOption {
  code: string;
  /** "EUR — Euro", or just the code when Intl has no name for it. */
  label: string;
}

/**
 * Create the User's first Household (spec, "First run"): a name and a Base
 * currency, with no default, chosen from `GET /currencies`.
 */
export function CreateHouseholdPage() {
  const { t } = useTranslation("firstRun");
  const { t: tCommon } = useTranslation();
  const { api } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const nameId = useId();
  const currencyId = useId();

  // The route's loader has fetched them already.
  const { data: currencies } = api.useSuspenseQuery("get", "/currencies");
  const options = useMemo(
    () =>
      currencies.items.map(({ code }): CurrencyOption => {
        const name = currencyName(code);
        return {
          code,
          label: name === undefined ? code : tCommon("currencyLabel", { code, name }),
        };
      }),
    [currencies, tCommon],
  );

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t("createHousehold.nameRequired"))
      .max(200, t("createHousehold.nameTooLong")),
    baseCurrency: z.string().min(1, t("createHousehold.baseCurrencyRequired")),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", baseCurrency: "" },
  });
  const create = api.useMutation("post", "/households");

  const openHousehold = async (householdId: string) => {
    await queryClient.invalidateQueries({ queryKey: ["get", "/households"] });
    await navigate({ to: "/households/$householdId", params: { householdId } });
  };

  const nameError = form.formState.errors.name?.message;
  const currencyError = form.formState.errors.baseCurrency?.message;
  const describedBy = (id: string, error: string | undefined, help?: string) =>
    [help, error === undefined ? undefined : `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <FirstRunCard title={t("createHousehold.title")} description={t("createHousehold.welcome")}>
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(({ name, baseCurrency }) => {
            create.mutate(
              { body: { name, base_currency: baseCurrency } },
              {
                onSuccess: (household) => void openHousehold(household.household_id),
              },
            );
          })(event);
        }}
      >
        <FieldGroup>
          {create.isError && <FormAlert error={create.error} />}
          <Field data-invalid={nameError !== undefined}>
            <FieldLabel htmlFor={nameId}>{t("createHousehold.name")}</FieldLabel>
            <Input
              id={nameId}
              autoComplete="off"
              placeholder={t("createHousehold.namePlaceholder")}
              aria-invalid={nameError !== undefined}
              aria-describedby={describedBy(nameId, nameError)}
              {...form.register("name")}
            />
            {nameError !== undefined && <FieldError id={`${nameId}-error`}>{nameError}</FieldError>}
          </Field>
          <Controller
            control={form.control}
            name="baseCurrency"
            render={({ field }) => (
              <Field data-invalid={currencyError !== undefined}>
                <FieldLabel htmlFor={currencyId}>{t("createHousehold.baseCurrency")}</FieldLabel>
                <Combobox
                  items={options}
                  value={options.find(({ code }) => code === field.value) ?? null}
                  onValueChange={(option: CurrencyOption | null) => {
                    field.onChange(option?.code ?? "");
                  }}
                  itemToStringLabel={(option: CurrencyOption) => option.label}
                  isItemEqualToValue={(a: CurrencyOption, b: CurrencyOption) => a.code === b.code}
                >
                  <ComboboxInput
                    id={currencyId}
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    placeholder={t("createHousehold.baseCurrencyPlaceholder")}
                    aria-invalid={currencyError !== undefined}
                    aria-describedby={describedBy(currencyId, currencyError, `${currencyId}-help`)}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>{t("createHousehold.noCurrency")}</ComboboxEmpty>
                    <ComboboxList>
                      {(option: CurrencyOption) => (
                        <ComboboxItem key={option.code} value={option}>
                          {option.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <FieldDescription id={`${currencyId}-help`}>
                  {t("createHousehold.baseCurrencyHelp")}
                </FieldDescription>
                {currencyError !== undefined && (
                  <FieldError id={`${currencyId}-error`}>{currencyError}</FieldError>
                )}
              </Field>
            )}
          />
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? t("createHousehold.creating") : t("createHousehold.create")}
          </Button>
        </FieldGroup>
      </form>
    </FirstRunCard>
  );
}
