import { Link } from "@tanstack/react-router";
import { PlusIcon, UploadIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { connectionsByName } from "../../components/connection-names";
import { buttonVariants } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

/**
 * The Connections tab (spec, "CSV mapping editor"): each Connection by name,
 * with Edit and an "Import statement" that goes straight to its file step.
 */
export function ConnectionsTab({
  householdId,
  accountId,
}: {
  householdId: string;
  accountId: string;
}) {
  const { t } = useTranslation("connections");
  const { api } = useApi();
  const params = { householdId, accountId };
  // The route's loader has fetched it.
  const { data } = api.useSuspenseQuery(
    "get",
    "/households/{household_id}/accounts/{account_id}/connections",
    { params: { path: { household_id: householdId, account_id: accountId } } },
  );
  const connections = connectionsByName(data.items);

  if (connections.length === 0) {
    return (
      <section aria-label={t("tab.title")}>
        <Card>
          <CardContent className="grid justify-items-start gap-3">
            <p>{t("tab.empty")}</p>
            <Link
              to="/households/$householdId/accounts/$accountId/connections/new"
              params={params}
              className={buttonVariants()}
            >
              {t("tab.create")}
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section aria-label={t("tab.title")} className="grid gap-3">
      <div className="flex justify-end">
        <Link
          to="/households/$householdId/accounts/$accountId/connections/new"
          params={params}
          className={buttonVariants({ variant: "outline" })}
        >
          <PlusIcon aria-hidden="true" />
          {t("tab.new")}
        </Link>
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("tab.columns.name")}</TableHead>
                <TableHead>{t("tab.columns.mapping")}</TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">{t("tab.columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.map(({ connection, name }) => (
                <TableRow key={connection.connection_id}>
                  <TableCell className="pl-4 font-medium">{name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {connection.csv_mapping === undefined ? t("tab.needsMapping") : t("tab.ready")}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        to="/households/$householdId/accounts/$accountId/connections/$connectionId"
                        params={{ ...params, connectionId: connection.connection_id }}
                        aria-label={t("tab.editNamed", { connection: name })}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        {t("tab.edit")}
                      </Link>
                      {connection.csv_mapping !== undefined && (
                        <Link
                          to="/households/$householdId/accounts/$accountId/statement-imports/new"
                          params={params}
                          search={{ connection_id: connection.connection_id }}
                          aria-label={t("tab.importNamed", { connection: name })}
                          className={buttonVariants({ size: "sm" })}
                        >
                          <UploadIcon aria-hidden="true" />
                          {t("tab.importStatement")}
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
