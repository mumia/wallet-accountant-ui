// One marked seam (ticket 12): the contract's Connection has no `name` yet
// (ticket 11's backend change adds it). Until it does, each Connection is named
// by its place among the Account's Connections, in the order they were created,
// and that order stands in for "by name". Ticket 11 swaps this for `name`.
import { useTranslation } from "react-i18next";

import type { components } from "../api/schema.gen";

export type Connection = components["schemas"]["Connection"];

export interface NamedConnection {
  connection: Connection;
  name: string;
}

/** The Account's Connections with their names, sorted by name. */
export function useConnectionNames(connections: readonly Connection[]): NamedConnection[] {
  const { t } = useTranslation();
  return connections.map((connection, index) => ({
    connection,
    name: t("connectionName", { number: index + 1 }),
  }));
}
