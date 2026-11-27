import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { useApi } from "../../api/context";
import type { components } from "../../api/schema.gen";
import { AmountInput } from "../../components/amount-input";
import { FormAlert } from "../../components/form-alert";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { FieldGroup } from "../../components/ui/field";
import { useRefetchAccountReads } from "../../lib/account-query";
import { formatDateLong, type IsoDate } from "../../lib/date";
import type { Decimal } from "../../lib/money";
import { checkOpeningCounts } from "./opening-count";

type Account = components["schemas"]["Account"];

/**
 * Correct opening count… (cash-accounts-and-transfers spec, "Correct opening
 * count…"): the count typed twice, as in Add Account, while the start date's
 * month is still open. The backend replaces the Opening balance Transaction.
 */
export function CorrectOpeningCountDialog({
  householdId,
  account,
  open,
  onOpenChange,
}: {
  householdId: string;
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("accounts");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("correctOpeningCount.title")}</DialogTitle>
          <DialogDescription>
            {t("correctOpeningCount.description", {
              date: formatDateLong(account.start_date as IsoDate),
            })}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts with both counts empty. */}
        {open && (
          <CorrectOpeningCountForm
            householdId={householdId}
            account={account}
            onDone={() => {
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CorrectOpeningCountForm({
  householdId,
  account,
  onDone,
}: {
  householdId: string;
  account: Account;
  onDone: () => void;
}) {
  const { t } = useTranslation("accounts");
  const { api } = useApi();
  const queryClient = useQueryClient();
  const refetchAccount = useRefetchAccountReads(householdId, account.account_id);
  const currencies = api.useQuery("get", "/currencies");
  const decimalPlaces =
    currencies.data?.items.find(({ code }) => code === account.currency)?.decimal_places ?? 2;
  const recount = api.useMutation(
    "post",
    "/households/{household_id}/accounts/{account_id}/opening-count",
  );

  const schema = z
    .object({
      openingCount: z.custom<Decimal | null>(),
      openingCountAgain: z.custom<Decimal | null>(),
    })
    .superRefine((counts, context) => {
      checkOpeningCounts(t, counts, context);
    });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { openingCount: null, openingCountAgain: null },
  });
  const { errors } = form.formState;

  // The balance and the Opening balance Transaction both change.
  const refetch = () =>
    Promise.all([
      refetchAccount(),
      queryClient.invalidateQueries({
        queryKey: [
          "get",
          "/households/{household_id}/accounts/{account_id}/transactions",
          { params: { path: { household_id: householdId, account_id: account.account_id } } },
        ],
      }),
    ]);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit(({ openingCount, openingCountAgain }) => {
          if (openingCount === null || openingCountAgain === null) {
            return;
          }
          recount.mutate(
            {
              params: { path: { household_id: householdId, account_id: account.account_id } },
              body: {
                opening_count: { amount: openingCount, currency: account.currency },
                opening_count_confirmation: {
                  amount: openingCountAgain,
                  currency: account.currency,
                },
              },
            },
            {
              onSuccess: () => {
                void refetch();
                onDone();
              },
            },
          );
        })(event);
      }}
    >
      <FieldGroup>
        {recount.isError && <FormAlert error={recount.error} />}
        {currencies.isError && <FormAlert error={currencies.error} />}
        <Controller
          control={form.control}
          name="openingCount"
          render={({ field }) => (
            <AmountInput
              label={t("add.openingCount")}
              currency={account.currency}
              decimalPlaces={decimalPlaces}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              required
              description={t("correctOpeningCount.help", {
                date: formatDateLong(account.start_date as IsoDate),
              })}
              {...(errors.openingCount?.message === undefined
                ? {}
                : { error: errors.openingCount.message })}
            />
          )}
        />
        <Controller
          control={form.control}
          name="openingCountAgain"
          render={({ field }) => (
            <AmountInput
              label={t("add.openingCountAgain")}
              currency={account.currency}
              decimalPlaces={decimalPlaces}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              required
              {...(errors.openingCountAgain?.message === undefined
                ? {}
                : { error: errors.openingCountAgain.message })}
            />
          )}
        />
        <Button type="submit" disabled={recount.isPending}>
          {recount.isPending ? t("correctOpeningCount.saving") : t("correctOpeningCount.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
