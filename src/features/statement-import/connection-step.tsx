import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import type { NamedConnection } from "../../components/connection-names";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { useLatestImportConnection } from "./statement-import-query";

/**
 * Step 1, with several Connections: a radio list by name. It preselects the
 * Connection of the Account's latest Statement import, else the first by name.
 * A Connection without a CSV mapping is listed, disabled, with a way to edit it.
 */
export function ConnectionStep({
  householdId,
  accountId,
  connections,
  chosenId,
  onContinue,
}: {
  householdId: string;
  accountId: string;
  connections: NamedConnection[];
  /** The Connection chosen before, when the User came Back to this step. */
  chosenId: string | undefined;
  onContinue: (connectionId: string) => void;
}) {
  const { t } = useTranslation("statementImport");
  const titleId = useId();
  const usable = connections.filter(({ connection }) => connection.csv_mapping !== undefined);
  const latest = useLatestImportConnection(
    householdId,
    usable.map(({ connection }) => connection),
  );
  const [selected, setSelected] = useState(
    chosenId ?? latest ?? usable[0]?.connection.connection_id,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3 id={titleId}>{t("connection.title")}</h3>
        </CardTitle>
        <CardDescription>{t("connection.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          aria-labelledby={titleId}
          value={selected ?? ""}
          onValueChange={(value: string) => {
            setSelected(value);
          }}
        >
          {connections.map(({ connection, name }) => {
            const disabled = connection.csv_mapping === undefined;
            return (
              <div
                key={connection.connection_id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border p-3",
                  selected === connection.connection_id && "border-primary bg-primary/5",
                )}
              >
                <Label
                  className={cn(
                    "flex min-h-6 flex-1 items-center gap-3",
                    disabled ? "cursor-not-allowed" : "cursor-pointer",
                  )}
                >
                  <RadioGroupItem value={connection.connection_id} disabled={disabled} />
                  <span className="grid">
                    <span className="font-medium">{name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {disabled ? t("connection.needsMapping") : t("connection.kind")}
                    </span>
                  </span>
                </Label>
                {disabled && (
                  <Link
                    to="/households/$householdId/accounts/$accountId/connections/$connectionId"
                    params={{ householdId, accountId, connectionId: connection.connection_id }}
                    search={{ from: "statement-import" }}
                    aria-label={t("connection.editNamed", { connection: name })}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {t("connection.edit")}
                  </Link>
                )}
              </div>
            );
          })}
        </RadioGroup>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          disabled={selected === undefined}
          onClick={() => {
            if (selected !== undefined) {
              onContinue(selected);
            }
          }}
        >
          {t("connection.continue")}
        </Button>
      </CardFooter>
    </Card>
  );
}

/** Step 1 with no Connection at all: create one first. */
export function NoConnection({
  householdId,
  accountId,
}: {
  householdId: string;
  accountId: string;
}) {
  const { t } = useTranslation("statementImport");
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{t("connection.noneTitle")}</h3>
        </CardTitle>
        <CardDescription>{t("connection.noneBody")}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Link
          to="/households/$householdId/accounts/$accountId/connections/new"
          params={{ householdId, accountId }}
          search={{ from: "statement-import" }}
          className={buttonVariants()}
        >
          {t("connection.create")}
        </Link>
      </CardFooter>
    </Card>
  );
}
