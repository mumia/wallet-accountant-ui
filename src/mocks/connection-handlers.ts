// The mock API's Connections: the list, create, rename, saving a CSV mapping
// and testing an unsaved one on a sample file, with the backend's rules and
// problems word for word
// (../wallet-accountant/internal/ingestion/adapters/http/connections.go and
// mappingtest.go).
import type { components } from "../api/schema.gen";
import { mappingDetail, mappingProblems } from "./csv-mapping-rules";
import type { MockDb, MockState } from "./db";
import { badRequest, http, withExactAmounts } from "./http";
import { hasBalanceColumn } from "../lib/csv-mapping";
import {
  currencyPlaces,
  fileBalanceOf,
  parseStatementFile,
  sampleRows,
  withBalances,
} from "./statement-files";

type Problem = components["schemas"]["Problem"];
type Account = components["schemas"]["Account"];
type Connection = components["schemas"]["Connection"];
type CsvMapping = components["schemas"]["CsvMapping"];

const notFound: Problem = { type: "about:blank", title: "Not Found", status: 404 };

const unprocessable = (type: string, title: string, detail: string): Problem => ({
  type: `/problems/${type}`,
  title,
  status: 422,
  detail,
});

const invalidName = unprocessable(
  "invalid-connection",
  "Invalid Connection",
  "The name must be 1 to 100 characters, not counting spaces around it.",
);

const nameTaken = (name: string) =>
  unprocessable(
    "connection-name-taken",
    "Connection name taken",
    `This Account already has a Connection named "${name.trim()}".`,
  );

const invalidMapping = (problems: string[]) =>
  unprocessable("invalid-csv-mapping", "Invalid CSV mapping", mappingDetail(problems));

/** The request schema's bounds come before the domain's checks, as in the backend. */
const nameOutOfBounds = (name: string) => name.length === 0 || name.length > 100;

const nameBadRequest = () => badRequest("name must be 1 to 100 characters.");

/** The Account, when the caller can see its Household. */
function findAccount(db: MockDb, householdId: string, accountId: string): Account | undefined {
  const state = db.read();
  const isMember =
    state.registered && state.households.some(({ household_id }) => household_id === householdId);
  return isMember
    ? state.accounts[householdId]?.find(({ account_id }) => account_id === accountId)
    : undefined;
}

const nameIsTaken = (connections: Connection[], name: string, except?: string) =>
  connections.some(
    (connection) =>
      connection.connection_id !== except &&
      connection.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );

/** The mapping as the backend keeps and returns it: no encoding is UTF-8. */
const keptMapping = (mapping: CsvMapping): CsvMapping => ({
  ...mapping,
  // The request may leave it out, whatever the generated type says.
  encoding: (mapping as Partial<CsvMapping>).encoding ?? "UTF_8",
});

function saveConnection(db: MockDb, accountId: string, connection: Connection) {
  const state: MockState = db.read();
  const connections = state.connections[accountId] ?? [];
  const exists = connections.some(
    ({ connection_id }) => connection_id === connection.connection_id,
  );
  db.write({
    ...state,
    connections: {
      ...state.connections,
      [accountId]: exists
        ? connections.map((c) => (c.connection_id === connection.connection_id ? connection : c))
        : [...connections, connection],
    },
  });
}

export function connectionHandlers(db: MockDb) {
  const connectionsPath = "/households/{household_id}/accounts/{account_id}/connections";
  return [
    http.get(connectionsPath, ({ params, response }) => {
      const account = findAccount(db, params.household_id, params.account_id);
      return account === undefined
        ? response(404).json(notFound)
        : response(200).json({ items: db.read().connections[params.account_id] ?? [] });
    }),

    http.post(connectionsPath, async ({ params, request, response }) => {
      const body = await request.json();
      const account = findAccount(db, params.household_id, params.account_id);
      if (account === undefined) {
        return response(404).json(notFound);
      }
      if (nameOutOfBounds(body.name)) {
        return response.untyped(nameBadRequest());
      }
      if (account.kind === "CASH") {
        return response(422).json(
          unprocessable(
            "invalid-connection",
            "Invalid Connection",
            "A cash Account is kept by hand and takes no Connection: record its Transactions directly.",
          ),
        );
      }
      const connections = db.read().connections[account.account_id] ?? [];
      if (body.name.trim() === "") {
        return response(422).json(invalidName);
      }
      if (nameIsTaken(connections, body.name)) {
        return response(422).json(nameTaken(body.name));
      }
      if (body.kind !== "STATEMENT_FILE_IMPORT") {
        return response(422).json(
          unprocessable(
            "invalid-connection",
            "Invalid Connection",
            body.kind === "BANK_FEED"
              ? "Bank feed Connections are not supported yet."
              : "The kind must be STATEMENT_FILE_IMPORT.",
          ),
        );
      }
      const problems = body.csv_mapping === undefined ? [] : mappingProblems(body.csv_mapping);
      if (problems.length > 0) {
        return response(422).json(invalidMapping(problems));
      }
      const connection: Connection = {
        connection_id: crypto.randomUUID(),
        name: body.name.trim(),
        account_id: account.account_id,
        kind: "STATEMENT_FILE_IMPORT",
        ...(body.csv_mapping === undefined
          ? {}
          : { csv_mapping: keptMapping(body.csv_mapping), csv_mapping_version: 1 }),
      };
      saveConnection(db, account.account_id, connection);
      return response(201).json(connection);
    }),

    http.patch(`${connectionsPath}/{connection_id}`, async ({ params, request, response }) => {
      const { name } = await request.json();
      const account = findAccount(db, params.household_id, params.account_id);
      const connections =
        account === undefined ? [] : (db.read().connections[account.account_id] ?? []);
      const connection = connections.find(
        ({ connection_id }) => connection_id === params.connection_id,
      );
      if (account === undefined || connection === undefined) {
        return response(404).json(notFound);
      }
      if (nameOutOfBounds(name)) {
        return response.untyped(nameBadRequest());
      }
      if (name.trim() === "") {
        return response(422).json(invalidName);
      }
      if (nameIsTaken(connections, name, connection.connection_id)) {
        return response(422).json(nameTaken(name));
      }
      const renamed = { ...connection, name: name.trim() };
      saveConnection(db, account.account_id, renamed);
      return response(200).json(renamed);
    }),

    http.put(
      `${connectionsPath}/{connection_id}/csv-mapping`,
      async ({ params, request, response }) => {
        const mapping = await request.json();
        const account = findAccount(db, params.household_id, params.account_id);
        const connection = (
          account === undefined ? [] : (db.read().connections[account.account_id] ?? [])
        ).find(({ connection_id }) => connection_id === params.connection_id);
        if (account === undefined || connection === undefined) {
          return response(404).json(notFound);
        }
        const problems = mappingProblems(mapping);
        if (problems.length > 0) {
          return response(422).json(invalidMapping(problems));
        }
        const saved: Connection = {
          ...connection,
          csv_mapping: keptMapping(mapping),
          csv_mapping_version: (connection.csv_mapping_version ?? 0) + 1,
        };
        saveConnection(db, account.account_id, saved);
        return response(200).json(saved);
      },
    ),

    http.post(
      "/households/{household_id}/accounts/{account_id}/csv-mapping-tests",
      async ({ params, request, response }) => {
        const form = await request.formData();
        const file = form.get("file");
        const mappingText = form.get("csv_mapping");
        const account = findAccount(db, params.household_id, params.account_id);
        if (account === undefined) {
          return response(404).json(notFound);
        }
        const mapping =
          typeof mappingText === "string" ? (JSON.parse(mappingText) as Partial<CsvMapping>) : {};
        const bytes = file instanceof Blob ? await file.arrayBuffer() : new ArrayBuffer(0);
        const problems = mappingProblems(mapping);
        if (problems.length > 0) {
          return response(422).json(invalidMapping(problems));
        }
        const { rows, errors } = parseStatementFile(
          bytes,
          mapping,
          currencyPlaces(account.currency),
        );
        if (rows.length === 0 && errors.length === 0) {
          return response(422).json(
            unprocessable(
              "empty-statement-file",
              "Empty statement file",
              "The statement file has no rows.",
            ),
          );
        }
        const parsedRow = (row: (typeof rows)[number]) => ({
          line: row.line,
          booking_date: row.bookingDate,
          transaction_date: row.transactionDate,
          ...(row.valueDate === undefined ? {} : { value_date: row.valueDate }),
          description: row.description,
          ...(row.payee === undefined ? {} : { payee: row.payee }),
          ...(row.bankTransactionId === undefined
            ? {}
            : { bank_transaction_id: row.bankTransactionId }),
          amount: { amount: row.amount as `${number}`, currency: account.currency },
          ...(row.balance === undefined
            ? {}
            : { balance: { amount: row.balance as `${number}`, currency: account.currency } }),
        });
        // As the backend's ReadSample: an import refuses unreadable rows before
        // it works out the file's balance.
        const balance = !hasBalanceColumn(mapping)
          ? undefined
          : errors.length > 0
            ? { problem: "the file has rows that can't be read" }
            : fileBalanceOf(withBalances(rows));
        const { first, last } = sampleRows(rows);
        return response.untyped(
          await withExactAmounts(
            response(200).json({
              rows: first.map(parsedRow),
              last_rows: last.map(parsedRow),
              ...(balance === undefined
                ? {}
                : "problem" in balance
                  ? { file_balance_problem: balance.problem }
                  : {
                      file_balance: {
                        amount: {
                          amount: balance.amount as `${number}`,
                          currency: account.currency,
                        },
                        line: balance.line,
                      },
                    }),
              readable_row_count: rows.length,
              unreadable_rows: errors,
            }),
          ),
        );
      },
    ),
  ];
}
