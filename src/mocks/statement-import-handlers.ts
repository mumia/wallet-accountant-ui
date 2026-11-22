// The mock API's Statement imports: preview, upload and the list, with the
// backend's rules and its problems word for word
// (../wallet-accountant/internal/ingestion/adapters/http/statementimports.go).
import type { components, Decimal } from "../api/schema.gen";
import type { ImportedRow, MockDb, MockState } from "./db";
import { http, withExactAmounts } from "./http";
import { fingerprint, fromUnits, readStatementFile, toUnits } from "./statement-files";

type Problem = components["schemas"]["Problem"];
type StatementFileProblem = components["schemas"]["StatementFileProblem"];
type StatementImportConflictProblem = components["schemas"]["StatementImportConflictProblem"];
type StatementImport = components["schemas"]["StatementImport"];
type Account = components["schemas"]["Account"];
type Connection = components["schemas"]["Connection"];

const notFound: Problem = { type: "about:blank", title: "Not Found", status: 404 };

/** The mock's currencies' decimal places, as `GET /currencies` serves them. */
const places: Record<string, number> = { ETH: 18, EUR: 2, GBP: 2, JPY: 0, USD: 2 };

const refused = (type: string, title: string, detail: string): StatementFileProblem => ({
  type: `/problems/${type}`,
  title,
  status: 422,
  detail,
});

const openingBalanceAlreadyRecorded: StatementImportConflictProblem = {
  type: "/problems/opening-balance-already-recorded",
  title: "Opening balance already recorded",
  status: 409,
  detail: "The Account already has its Opening balance from its first Statement import.",
};

interface Found {
  state: MockState;
  account: Account;
  connection: Connection;
}

/** The Connection and its Account, when the caller can see the Household. */
function find(db: MockDb, householdId: string, connectionId: string): Found | undefined {
  const state = db.read();
  const isMember =
    state.registered && state.households.some(({ household_id }) => household_id === householdId);
  if (!isMember) {
    return undefined;
  }
  for (const account of state.accounts[householdId] ?? []) {
    const connection = (state.connections[account.account_id] ?? []).find(
      (candidate) => candidate.connection_id === connectionId,
    );
    if (connection !== undefined) {
      return { state, account, connection };
    }
  }
  return undefined;
}

interface Upload {
  text: string;
  exportBalance: string;
  confirmation: string | undefined;
  previewId: string | undefined;
}

async function readUpload(request: Request): Promise<Upload> {
  const form = await request.formData();
  const file = form.get("file");
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : undefined;
  };
  return {
    text: file instanceof Blob ? await file.text() : "",
    exportBalance: field("export_balance") ?? "",
    confirmation: field("export_balance_confirmation"),
    previewId: field("preview_id"),
  };
}

type Read =
  | { kind: "refused"; problem: StatementFileProblem }
  | { kind: "conflict"; problem: StatementImportConflictProblem }
  | {
      kind: "read";
      rows: {
        line: number;
        bookingDate: string;
        description: string;
        amount: string;
        id?: string;
      }[];
      ignored: number;
      currencyPlaces: number;
    };

/** What preview and upload share: the Export balance, the mapping, the file. */
function readFile({ state, account, connection }: Found, upload: Upload): Read {
  const currencyPlaces = places[account.currency] ?? 2;
  if (!/^-?\d+(\.\d+)?$/.test(upload.exportBalance)) {
    return {
      kind: "refused",
      problem: refused(
        "invalid-export-balance",
        "Invalid Export balance",
        "The Export balance must be a decimal number.",
      ),
    };
  }
  const [, fraction = ""] = upload.exportBalance.split(".");
  if (fraction.replace(/0+$/, "").length > currencyPlaces) {
    return {
      kind: "refused",
      problem: refused(
        "invalid-export-balance",
        "Invalid Export balance",
        "The Export balance has more decimal places than the Account currency.",
      ),
    };
  }
  if (connection.csv_mapping === undefined) {
    return {
      kind: "refused",
      problem: refused(
        "csv-mapping-required",
        "CSV mapping required",
        "The Connection needs a CSV mapping before a statement file can be imported.",
      ),
    };
  }
  const file = fingerprint(upload.text);
  const earlier = (state.statementImports?.[connection.connection_id] ?? []).find(
    (item) =>
      item.voided_at === undefined && state.statementFiles?.[item.statement_import_id] === file,
  );
  if (earlier !== undefined) {
    return {
      kind: "conflict",
      problem: {
        type: "/problems/duplicate-statement-import",
        title: "Statement file already imported",
        status: 409,
        detail: `This file was already imported through the Connection as Statement import ${earlier.statement_import_id}.`,
        statement_import_id: earlier.statement_import_id,
      },
    };
  }
  const read = readStatementFile(upload.text, connection.csv_mapping, currencyPlaces);
  if (read.kind === "unreadable") {
    return {
      kind: "refused",
      problem: {
        ...refused(
          "unreadable-statement-file",
          "Unreadable statement file",
          "The statement file was not imported: every line listed in rows can't be read.",
        ),
        rows: read.rows,
      },
    };
  }
  if (read.kind === "empty") {
    return {
      kind: "refused",
      problem: refused(
        "empty-statement-file",
        "Empty statement file",
        "The statement file has no rows.",
      ),
    };
  }
  const kept = read.rows.filter((row) => row.bookingDate >= account.start_date);
  return {
    kind: "read",
    rows: kept.map((row) => ({
      line: row.line,
      bookingDate: row.bookingDate,
      description: row.description,
      amount: row.amount,
      ...(row.bankTransactionId === undefined ? {} : { id: row.bankTransactionId }),
    })),
    ignored: read.rows.length - kept.length,
    currencyPlaces,
  };
}

const total = (amounts: string[], currencyPlaces: number) =>
  amounts.reduce((sum, amount) => sum + toUnits(amount, currencyPlaces), 0n);

function previewId(found: Found, upload: Upload): string {
  return fingerprint(
    [
      found.account.account_id,
      found.connection.connection_id,
      fingerprint(upload.text),
      upload.exportBalance,
      String(found.connection.csv_mapping_version ?? 0),
    ].join("|"),
  );
}

const money = (amount: string, currency: string) => ({ amount: amount as Decimal, currency });

const importsPath = "/households/{household_id}/connections/{connection_id}/statement-imports";

export function statementImportHandlers(db: MockDb) {
  return [
    http.get(importsPath, async ({ params, response }) => {
      const found = find(db, params.household_id, params.connection_id);
      if (found === undefined) {
        return response(404).json(notFound);
      }
      const items = found.state.statementImports?.[params.connection_id] ?? [];
      return response.untyped(await withExactAmounts(response(200).json({ items })));
    }),

    http.post(`${importsPath}/previews`, async ({ params, request, response }) => {
      // Read the body first: the state read after it is the current one.
      const upload = await readUpload(request);
      const found = find(db, params.household_id, params.connection_id);
      if (found === undefined) {
        return response(404).json(notFound);
      }
      if (!found.account.awaiting_first_statement_import) {
        return response(409).json(openingBalanceAlreadyRecorded);
      }
      const read = readFile(found, upload);
      if (read.kind === "refused") {
        return response(422).json(read.problem);
      }
      if (read.kind === "conflict") {
        return response(409).json(read.problem);
      }
      const { currencyPlaces } = read;
      if (
        upload.confirmation === undefined ||
        toUnits(upload.confirmation, currencyPlaces) !==
          toUnits(upload.exportBalance, currencyPlaces)
      ) {
        return response(422).json(
          refused(
            "export-balance-mismatch",
            "Export balance entries differ",
            "The Export balance and its confirmation must be the same amount.",
          ),
        );
      }
      const rowsTotal = total(
        read.rows.map((row) => row.amount),
        currencyPlaces,
      );
      const exportUnits = toUnits(upload.exportBalance, currencyPlaces);
      const currency = found.account.currency;
      return response.untyped(
        await withExactAmounts(
          response(200).json({
            preview_id: previewId(found, upload),
            opening_balance: money(fromUnits(exportUnits - rowsTotal, currencyPlaces), currency),
            start_date: found.account.start_date,
            export_balance: money(fromUnits(exportUnits, currencyPlaces), currency),
            row_count: read.rows.length,
            rows_ignored_before_start_date: read.ignored,
            rows_total: money(fromUnits(rowsTotal, currencyPlaces), currency),
          }),
        ),
      );
    }),

    http.post(importsPath, async ({ params, request, response }) => {
      // Read the body first: the state read after it is the current one.
      const upload = await readUpload(request);
      const found = find(db, params.household_id, params.connection_id);
      if (found === undefined) {
        return response(404).json(notFound);
      }
      const { state, account, connection } = found;
      const first = account.awaiting_first_statement_import;
      if (!first && upload.previewId !== undefined) {
        return response(409).json(openingBalanceAlreadyRecorded);
      }
      const read = readFile(found, upload);
      if (read.kind === "refused") {
        return response(422).json(read.problem);
      }
      if (read.kind === "conflict") {
        return response(409).json(read.problem);
      }
      if (first && upload.previewId === undefined) {
        return response(422).json(
          refused(
            "preview-required",
            "Preview required",
            "The Account's first Statement import needs the preview_id of its preview.",
          ),
        );
      }
      if (first && upload.previewId !== previewId(found, upload)) {
        return response(422).json(
          refused(
            "preview-mismatch",
            "Upload doesn't match its preview",
            "The file, the Export balance or the Connection's CSV mapping differs from the preview; preview it again.",
          ),
        );
      }

      const { currencyPlaces } = read;
      const currency = account.currency;
      const earlier = state.importedRows?.[account.account_id] ?? [];
      const repeats = read.rows.filter((row) =>
        earlier.some(
          (old) =>
            row.id !== undefined &&
            old.bank_transaction_id === row.id &&
            old.booking_date === row.bookingDate &&
            old.amount.amount === row.amount,
        ),
      );
      const fresh = read.rows.filter((row) => !repeats.includes(row));
      const suspected = fresh.filter((row) =>
        earlier.some(
          (old) =>
            old.state !== "DISCARDED" &&
            old.booking_date === row.bookingDate &&
            old.amount.amount === row.amount,
        ),
      );
      const rowsTotal = total(
        fresh.map((row) => row.amount),
        currencyPlaces,
      );
      const exportUnits = toUnits(upload.exportBalance, currencyPlaces);
      const balanceBefore = toUnits(account.balance?.amount ?? "0", currencyPlaces);
      const expected = balanceBefore + rowsTotal;
      if (!first && suspected.length === 0 && expected !== exportUnits) {
        const problem: StatementFileProblem = {
          ...refused(
            "balance-check-failed",
            "Balance check failed",
            `The Account's Opening balance and Imported transactions, with this file's new rows, come to ${fromUnits(expected, currencyPlaces)} ${currency}, but the Export balance is ${fromUnits(exportUnits, currencyPlaces)} ${currency} (difference ${fromUnits(exportUnits - expected, currencyPlaces)}). Nothing was imported: check the file, its mapping and the Export balance.`,
          ),
          expected_balance: money(fromUnits(expected, currencyPlaces), currency),
          export_balance: money(fromUnits(exportUnits, currencyPlaces), currency),
          difference: money(fromUnits(exportUnits - expected, currencyPlaces), currency),
        };
        return response.untyped(await withExactAmounts(response(422).json(problem)));
      }

      const statementImportId = crypto.randomUUID();
      const opening = exportUnits - rowsTotal;
      const recorded: StatementImport = {
        statement_import_id: statementImportId,
        connection_id: connection.connection_id,
        account_id: account.account_id,
        export_balance: money(fromUnits(exportUnits, currencyPlaces), currency),
        rows_imported: fresh.length,
        rows_skipped_as_certain_repeats: repeats.length,
        suspected_duplicates: suspected.length,
        rows_ignored_before_start_date: read.ignored,
        rows_total: money(fromUnits(rowsTotal, currencyPlaces), currency),
        balance_check: suspected.length > 0 ? "WAITING" : "PASSED",
        imported_at: new Date().toISOString(),
        ...(first ? { opening_balance: money(fromUnits(opening, currencyPlaces), currency) } : {}),
      };
      const newRows: ImportedRow[] = fresh.map((row) => {
        const resembled = suspected.includes(row)
          ? earlier.find(
              (old) =>
                old.state !== "DISCARDED" &&
                old.booking_date === row.bookingDate &&
                old.amount.amount === row.amount,
            )
          : undefined;
        return {
          imported_transaction_id: crypto.randomUUID(),
          statement_import_id: statementImportId,
          state: resembled === undefined ? "PENDING" : "SUSPECTED_DUPLICATE",
          line: row.line,
          booking_date: row.bookingDate,
          transaction_date: row.bookingDate,
          amount: money(row.amount, currency),
          description: row.description,
          ...(row.id === undefined ? {} : { bank_transaction_id: row.id }),
          ...(resembled === undefined ? {} : { resembles_id: resembled.imported_transaction_id }),
        };
      });
      const changedAccount: Account = {
        ...account,
        awaiting_first_statement_import: false,
        balance: money(
          fromUnits(first ? exportUnits : balanceBefore + rowsTotal, currencyPlaces),
          currency,
        ),
      };
      const householdId = params.household_id;
      const openingCategory = (state.categories[householdId] ?? []).find(
        (category) => category.kind === "INTERNAL" && category.name === "Opening balance",
      );
      const transactions =
        first && openingCategory !== undefined
          ? [
              {
                transaction_id: crypto.randomUUID(),
                booking_date: account.start_date,
                transaction_date: account.start_date,
                description: "Opening balance",
                amount: money(fromUnits(opening, currencyPlaces), currency),
                category_id: openingCategory.category_id,
                category_name: openingCategory.name,
              },
              ...(state.transactions[account.account_id] ?? []),
            ]
          : state.transactions[account.account_id];
      db.write({
        ...state,
        accounts: {
          ...state.accounts,
          [householdId]: (state.accounts[householdId] ?? []).map((candidate) =>
            candidate.account_id === account.account_id ? changedAccount : candidate,
          ),
        },
        transactions: {
          ...state.transactions,
          ...(transactions === undefined ? {} : { [account.account_id]: transactions }),
        },
        statementImports: {
          ...state.statementImports,
          [connection.connection_id]: [
            ...(state.statementImports?.[connection.connection_id] ?? []),
            recorded,
          ],
        },
        statementFiles: { ...state.statementFiles, [statementImportId]: fingerprint(upload.text) },
        importedRows: { ...state.importedRows, [account.account_id]: [...earlier, ...newRows] },
        // The backend raises it a little later; the mock at once.
        ...(suspected.length > 0
          ? {
              notifications: {
                ...state.notifications,
                [householdId]: [
                  {
                    notification_id: crypto.randomUUID(),
                    kind: "SUSPECTED_DUPLICATES_FOUND",
                    statement_import_id: statementImportId,
                    connection_id: connection.connection_id,
                    account_id: account.account_id,
                    suspected_duplicates: suspected.length,
                    created_at: new Date().toISOString(),
                    read: false,
                  },
                  ...(state.notifications?.[householdId] ?? []),
                ],
              },
            }
          : {}),
      });
      return response.untyped(await withExactAmounts(response(201).json(recorded)));
    }),
  ];
}
