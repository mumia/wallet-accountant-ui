import { Link, useNavigate } from "@tanstack/react-router";
import { CheckIcon, CircleAlertIcon } from "lucide-react";
import { useId, useState, type ReactNode, type SubmitEvent } from "react";
import { useTranslation } from "react-i18next";

import { isProblem } from "../../api/problem";
import { AmountInput } from "../../components/amount-input";
import { DateInput } from "../../components/date-input";
import { FormAlert } from "../../components/form-alert";
import { useRecordTransaction } from "../../components/record-transaction";
import { mediumDate } from "../../components/row-label";
import { useInfoToast } from "../../components/toaster";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "../../components/ui/field";
import { countedOnRange, lastDayOf } from "../../lib/cash-dates";
import { formatDate, formatDateLong, type IsoDate } from "../../lib/date";
import { addMonths, formatMonth, hasEnded, type Month } from "../../lib/month";
import { differenceForDisplay, formatMoney, type Decimal, type Money } from "../../lib/money";
import { useCloseMonth, type AccountMonth } from "./months-query";

const linkClass = "font-medium underline underline-offset-4";

/** What stops a month closing, from the month's counts or a refused close's fields. */
interface Blockers {
  pending: number;
  suspected: number;
  uncategorised: number;
  unchecked: { statement_import_id: string; balance_check: string }[];
}

/** A refused close, read by its fields: `reasons` with the counts and balances beside them. */
function refusal(error: unknown) {
  if (!isProblem(error)) {
    return undefined;
  }
  const fields = error as Record<string, unknown>;
  if (!Array.isArray(fields["reasons"])) {
    return undefined;
  }
  const count = (key: string) => (typeof fields[key] === "number" ? fields[key] : 0);
  const money = (key: string) => {
    const value = fields[key];
    return typeof value === "object" && value !== null && "amount" in value
      ? (value as Money)
      : undefined;
  };
  const unchecked = Array.isArray(fields["unchecked_statement_imports"])
    ? (fields["unchecked_statement_imports"] as Blockers["unchecked"])
    : [];
  const computed = money("computed_balance");
  const statement = money("statement_balance");
  const difference = money("difference");
  return {
    blockers: {
      pending: count("pending"),
      suspected: count("suspected_duplicates"),
      uncategorised: count("uncategorised"),
      unchecked,
    },
    mismatch:
      computed !== undefined && statement !== undefined && difference !== undefined
        ? { computed, statement, difference }
        : undefined,
  };
}

function BlockerList({
  householdId,
  accountId,
  month,
  blockers,
}: {
  householdId: string;
  accountId: string;
  month: Month;
  blockers: Blockers;
}) {
  const { t } = useTranslation("months");
  const params = { householdId, accountId };
  const items: { key: string; link: ReactNode }[] = [];
  if (blockers.pending > 0) {
    items.push({
      key: "pending",
      link: (
        <Link
          to="/households/$householdId/accounts/$accountId/to-review"
          params={params}
          search={{ booking_month: month }}
          className={linkClass}
        >
          {t("blockers.pending", { count: blockers.pending })}
        </Link>
      ),
    });
  }
  if (blockers.suspected > 0) {
    items.push({
      key: "suspected",
      link: (
        <Link
          to="/households/$householdId/accounts/$accountId/to-review"
          params={params}
          search={{ booking_month: month, state: "SUSPECTED_DUPLICATE" }}
          className={linkClass}
        >
          {t("blockers.suspected", { count: blockers.suspected })}
        </Link>
      ),
    });
  }
  if (blockers.uncategorised > 0) {
    items.push({
      key: "uncategorised",
      link: (
        <Link
          to="/households/$householdId/accounts/$accountId/transactions"
          params={params}
          search={{ booking_month: month, uncategorised: true }}
          className={linkClass}
        >
          {t("blockers.uncategorised", { count: blockers.uncategorised })}
        </Link>
      ),
    });
  }
  for (const item of blockers.unchecked) {
    const check = item.balance_check;
    items.push({
      key: item.statement_import_id,
      link: (
        <Link
          to="/households/$householdId/accounts/$accountId/statement-imports"
          params={params}
          search={{ statement_import_id: item.statement_import_id }}
          className={linkClass}
        >
          {t("blockers.unchecked", {
            check:
              check === "WAITING" || check === "FAILED" ? t(`blockers.checks.${check}`) : check,
          })}
        </Link>
      ),
    });
  }
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="grid list-disc gap-1 pl-5">
      {items.map(({ key, link }) => (
        <li key={key}>{link}</li>
      ))}
    </ul>
  );
}

/**
 * The open month (spec, "Month screen": Open): what stops it closing, each
 * linking to its fix, and the Close month form with the computed balance and
 * the difference live. A refused close replaces the blockers with its reasons.
 *
 * A cash month closes by a Cash count instead (cash-accounts-and-transfers
 * spec, "Closing a cash month"): the count and the day it was taken, with no
 * live difference, since the server compares the books at the end of that day.
 * A balance mismatch then offers Record the difference….
 */
export function OpenMonth({
  householdId,
  accountId,
  month,
  status,
  currency,
  decimalPlaces,
  cash,
}: {
  householdId: string;
  accountId: string;
  month: Month;
  status: AccountMonth;
  currency: string;
  decimalPlaces: number;
  cash: boolean;
}) {
  const { t } = useTranslation("months");
  const navigate = useNavigate();
  const toast = useInfoToast();
  const openRecord = useRecordTransaction();
  const close = useCloseMonth(householdId, accountId, currency);
  const countedOnId = useId();
  // Each render, so a page left open past midnight UTC follows the day, as `ended` does.
  const range = countedOnRange(month);
  const [statementBalance, setStatementBalance] = useState<Decimal | null>(null);
  const [countedOn, setCountedOn] = useState<IsoDate | null>(() => countedOnRange(month).initial);
  const [error, setError] = useState<string>();
  const [dateError, setDateError] = useState<string>();
  const next = addMonths(month, 1);
  const ended = hasEnded(month);
  const refused = close.isError ? refusal(close.error) : undefined;
  const computed = status.computed_balance;
  const blockers: Blockers = refused?.blockers ?? {
    pending: status.pending,
    suspected: status.suspected_duplicates,
    uncategorised: status.uncategorised,
    unchecked: status.unchecked_statement_imports,
  };
  const anyBlocker =
    blockers.pending + blockers.suspected + blockers.uncategorised + blockers.unchecked.length > 0;

  const checkCountedOn = (date: IsoDate | null) =>
    date === null
      ? t("close.countedOnInvalid", { example: formatDate(range.initial) })
      : date < range.min
        ? t("close.countedOnTooEarly", {
            month: formatMonth(month),
            date: formatDateLong(range.min),
          })
        : date > range.max
          ? t("close.countedOnTooLate", { date: formatDateLong(range.max) })
          : undefined;

  // What Record the difference… records: the count less the books.
  const difference = refused?.mismatch?.difference.amount;
  // The day the refused close was counted on, for the books' label.
  const refusedCountedOn = close.variables?.countedOn;

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountError =
      statementBalance === null ? t(cash ? "close.countRequired" : "close.required") : undefined;
    const countedOnError = cash ? checkCountedOn(countedOn) : undefined;
    setError(amountError);
    setDateError(countedOnError);
    if (statementBalance === null || amountError !== undefined || countedOnError !== undefined) {
      return;
    }
    // Awaited, not a mutate callback: the refetched months unmount this form
    // before a callback would run.
    void close
      .mutateAsync({
        month,
        statementBalance,
        ...(cash && countedOn !== null ? { countedOn } : {}),
      })
      .then(() => {
        toast(t("close.closed", { month: formatMonth(month), next: formatMonth(next) }));
        return navigate({
          to: "/households/$householdId/accounts/$accountId/months/$bookingMonth",
          params: { householdId, accountId, bookingMonth: next },
        });
      })
      // A refusal is shown from the mutation's error.
      .catch(() => undefined);
  };

  return (
    <div className="grid gap-4">
      {refused === undefined ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h3>{t("blockers.title", { month: formatMonth(month) })}</h3>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {anyBlocker ? (
              <BlockerList
                householdId={householdId}
                accountId={accountId}
                month={month}
                blockers={blockers}
              />
            ) : (
              <p className="flex items-center gap-2">
                <CheckIcon aria-hidden="true" className="size-4" />
                {t("blockers.none", { month: formatMonth(month) })}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>{t("refused.title", { month: formatMonth(month) })}</AlertTitle>
          <AlertDescription className="grid gap-3 text-foreground">
            <BlockerList
              householdId={householdId}
              accountId={accountId}
              month={month}
              blockers={blockers}
            />
            {refused.mismatch !== undefined && (
              <div className="grid gap-1">
                <p className="font-medium">
                  {t(cash ? "refused.countMismatch" : "refused.mismatch")}
                </p>
                <dl className="grid grid-cols-[auto_auto] justify-start gap-x-6 gap-y-1">
                  <dt>
                    {cash && refusedCountedOn !== undefined
                      ? t("refused.booksOn", { date: mediumDate(refusedCountedOn) })
                      : t("refused.computed")}
                  </dt>
                  <dd className="text-right tabular-nums">
                    {formatMoney(refused.mismatch.computed)}
                  </dd>
                  <dt>{t(cash ? "refused.count" : "refused.statement")}</dt>
                  <dd className="text-right tabular-nums">
                    {formatMoney(refused.mismatch.statement)}
                  </dd>
                  <dt>{t("refused.difference")}</dt>
                  <dd className="text-right font-medium tabular-nums">
                    {formatMoney(refused.mismatch.difference)}
                  </dd>
                </dl>
                {cash && openRecord !== undefined && (
                  <div className="grid justify-items-start gap-2 pt-2">
                    <p>{t("refused.recordHint")}</p>
                    <Button
                      variant="outline"
                      // An outline button inherits the alert's colour.
                      className="text-foreground"
                      onClick={() => {
                        openRecord({
                          ...(difference === undefined ? {} : { amount: difference }),
                          date: lastDayOf(month),
                          description: t("refused.differenceDescription"),
                          // The refusal's numbers are out of date once it's recorded:
                          // the month's own blockers show again until the next close.
                          onRecorded: () => {
                            close.reset();
                          },
                        });
                      }}
                    >
                      {t("refused.recordDifference")}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            <h3>{t("close.title")}</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={submit} className="grid gap-4">
            {close.isError && refused === undefined && <FormAlert error={close.error} />}
            <fieldset disabled={!ended} className="grid gap-4 disabled:opacity-60">
              <AmountInput
                label={t(cash ? "close.cashCount" : "close.statementBalance")}
                currency={currency}
                decimalPlaces={decimalPlaces}
                value={statementBalance}
                onValueChange={(value) => {
                  setStatementBalance(value);
                  setError(undefined);
                }}
                description={
                  cash
                    ? t("close.cashCountHelp")
                    : t("close.statementBalanceHelp", { month: formatMonth(month) })
                }
                {...(error === undefined ? {} : { error })}
              />
              {cash && (
                <Field data-invalid={dateError !== undefined}>
                  <FieldLabel htmlFor={countedOnId}>{t("close.countedOn")}</FieldLabel>
                  <DateInput
                    id={countedOnId}
                    value={countedOn}
                    onValueChange={(date) => {
                      setCountedOn(date);
                      setDateError(undefined);
                    }}
                    min={range.min}
                    max={range.max}
                    aria-invalid={dateError !== undefined}
                    aria-describedby={
                      dateError === undefined
                        ? `${countedOnId}-help`
                        : `${countedOnId}-help ${countedOnId}-error`
                    }
                  />
                  <FieldDescription id={`${countedOnId}-help`}>
                    {t("close.countedOnHelp", { month: formatMonth(month) })}
                  </FieldDescription>
                  {dateError !== undefined && (
                    <FieldError id={`${countedOnId}-error`}>{dateError}</FieldError>
                  )}
                </Field>
              )}
              {/* For cash the server compares the books at the end of Counted on, which this page doesn't know. */}
              {!cash && computed !== undefined && (
                <div className="grid gap-1 text-sm">
                  <p className="tabular-nums">
                    {t("close.computed", { computed: formatMoney(computed) })}
                    {statementBalance !== null && (
                      <>
                        {" · "}
                        {t("close.difference", {
                          difference: formatMoney(
                            differenceForDisplay({ amount: statementBalance, currency }, computed),
                          ),
                        })}
                      </>
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    {t("close.nothingBooked")}{" "}
                    <Link
                      to="/households/$householdId/accounts/$accountId/transactions"
                      params={{ householdId, accountId }}
                      search={{ booking_month: month }}
                      className={linkClass}
                    >
                      {t("close.seeTransactions", { month: formatMonth(month) })}
                    </Link>
                  </p>
                </div>
              )}
              <div className="grid justify-items-start gap-2">
                <Button type="submit" disabled={!ended || close.isPending}>
                  {close.isPending
                    ? t("close.closing")
                    : t("close.submit", { month: formatMonth(month) })}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {t("close.consequence", { month: formatMonth(month), next: formatMonth(next) })}
                </p>
              </div>
            </fieldset>
            {!ended && (
              <p className="text-sm font-medium">
                {t("close.notEnded", {
                  month: formatMonth(month),
                  date: mediumDate(`${next}-01`),
                })}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
