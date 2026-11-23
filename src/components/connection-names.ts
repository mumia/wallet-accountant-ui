import type { components } from "../api/schema.gen";

export type Connection = components["schemas"]["Connection"];

export interface NamedConnection {
  connection: Connection;
  name: string;
}

/** The Account's Connections with their names, sorted by name as the User reads them. */
export function connectionsByName(connections: readonly Connection[]): NamedConnection[] {
  return connections
    .map((connection) => ({ connection, name: connection.name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
