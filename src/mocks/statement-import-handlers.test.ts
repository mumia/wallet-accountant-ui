// @vitest-environment node
import { describe, expect, it } from "vitest";

import { mockDb } from "../test/server";
import { mainConnections } from "./db";

// Main's "ING export" (src/mocks/db.ts) reads `Date;Description;Amount;Id`;
// these tests give it a Balance column. Main already has its Opening balance,
// so each upload is a later import.
const home = "0190f5f2-7c00-7000-8000-000000000001";
const [ingExport] = mainConnections;

function withBalanceColumn() {
  const state = mockDb.read();
  const accountId = ingExport?.account_id ?? "";
  mockDb.write({
    ...state,
    connections: {
      ...state.connections,
      [accountId]: (state.connections[accountId] ?? []).map((connection) =>
        connection.connection_id === ingExport?.connection_id && connection.csv_mapping
          ? {
              ...connection,
              csv_mapping: {
                ...connection.csv_mapping,
                columns: { ...connection.csv_mapping.columns, balance: { header: "Balance" } },
              },
            }
          : connection,
      ),
    },
  });
}

async function upload(rows: string[], exportBalance: string) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([["Date;Description;Amount;Id;Balance", ...rows].join("\n")], { type: "text/csv" }),
    "statement.csv",
  );
  form.append("export_balance", exportBalance);
  const response = await fetch(
    `http://localhost/api/households/${home}/connections/${ingExport?.connection_id ?? ""}/statement-imports`,
    { method: "POST", body: form, headers: { "Idempotency-Key": crypto.randomUUID() } },
  );
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe("a later import through a mapping with a balance column", () => {
  it("is refused when the Export balance isn't the file's balance", async () => {
    withBalanceColumn();
    const { status, body } = await upload(
      ["2026-11-20;Coffee;-3.50;NL-2001;1231.00", "2026-11-21;Tea;-2.00;NL-2002;1229.00"],
      "1000",
    );
    expect(status).toBe(422);
    expect(body).toMatchObject({
      type: "/problems/export-balance-differs-from-file",
      title: "Export balance differs from the file",
      detail:
        "The Export balance, 1000.00 EUR, isn't the file's balance, 1229.00 EUR (line 3). Check it is the bank's booked balance.",
      file_balance: "1229.00",
      line: 3,
    });
  });

  it("is refused when the balance column doesn't add up", async () => {
    withBalanceColumn();
    const { status, body } = await upload(
      ["2026-11-20;Coffee;-3.50;NL-2001;1231.00", "2026-11-21;Tea;-2.00;NL-2002;1000.00"],
      "1000",
    );
    expect(status).toBe(422);
    expect(body).toMatchObject({
      type: "/problems/file-balance-unknown",
      title: "File balance can't be worked out",
      detail:
        "The file's balance can't be worked out, so its Export balance can't be checked: the balance column doesn't add up from one end of the file to the other. Check the CSV mapping's balance column.",
    });
  });
});
