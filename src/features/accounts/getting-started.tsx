import { Link } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { Button, buttonVariants } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { formatDateLong, type IsoDate } from "../../lib/date";

/**
 * The getting-started checklist (spec, "First run"), while an Account awaits
 * its first Statement import: create a Connection, then import the first
 * statement, which stays disabled until a Connection exists.
 */
export function GettingStarted({
  householdId,
  accountId,
}: {
  householdId: string;
  accountId: string;
}) {
  const { t } = useTranslation("accounts");
  const { api } = useApi();
  const headingId = useId();
  const blockedId = useId();
  const path = { params: { path: { household_id: householdId, account_id: accountId } } };
  // The routes' loaders have fetched both already.
  const { data: account } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}",
    path,
  );
  const { data: connections } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}/connections",
    path,
  );
  const connection = connections.items[0];
  const params = { householdId, accountId };

  return (
    <section aria-labelledby={headingId}>
      <Card>
        <CardContent className="grid gap-4">
          <h2 id={headingId} className="text-lg font-semibold">
            {t("gettingStarted.title")}
          </h2>
          <ol className="grid gap-4">
            <Step
              number={1}
              done={connection !== undefined}
              title={t("gettingStarted.connection.title")}
              body={t("gettingStarted.connection.body")}
            >
              {connection === undefined ? (
                <Link
                  to="/households/$householdId/accounts/$accountId/connections/new"
                  params={params}
                  className={buttonVariants()}
                >
                  {t("gettingStarted.connection.action")}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("gettingStarted.connection.done")}
                </p>
              )}
            </Step>
            <Step
              number={2}
              done={false}
              title={t("gettingStarted.statement.title")}
              body={t("gettingStarted.statement.body", {
                start: formatDateLong(account.start_date as IsoDate),
              })}
            >
              {connection === undefined ? (
                <>
                  <Button disabled aria-describedby={blockedId}>
                    {t("gettingStarted.statement.action")}
                  </Button>
                  <p id={blockedId} className="text-sm text-muted-foreground">
                    {t("gettingStarted.statement.blocked")}
                  </p>
                </>
              ) : (
                <Link
                  to="/households/$householdId/accounts/$accountId/statement-imports/new"
                  params={params}
                  search={{ connection_id: connection.connection_id }}
                  className={buttonVariants()}
                >
                  {t("gettingStarted.statement.action")}
                </Link>
              )}
            </Step>
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}

function Step({
  number,
  done,
  title,
  body,
  children,
}: {
  number: number;
  done: boolean;
  title: string;
  body: string;
  children: ReactNode;
}) {
  const { t } = useTranslation("accounts");
  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
      <span
        aria-hidden="true"
        className={
          done
            ? "flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
            : "flex size-7 items-center justify-center rounded-full border text-sm font-medium"
        }
      >
        {done ? <CheckIcon className="size-4" /> : number}
      </span>
      <div className="grid gap-1">
        <h3 className="font-medium">
          {title}
          {done && <span className="sr-only">{t("gettingStarted.doneSuffix")}</span>}
        </h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="col-start-2 grid justify-items-start gap-1">{children}</div>
    </li>
  );
}
