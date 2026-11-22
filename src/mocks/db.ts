// The mock API's data: who the signed-in identity is and what it owns. Tests
// keep it in memory; mock mode keeps it in sessionStorage, so a reload in the
// tab keeps a redeemed Invitation and a new Household.
import type { components } from "../api/schema.gen";

type Household = components["schemas"]["Household"];
type Account = components["schemas"]["Account"];
type Connection = components["schemas"]["Connection"];
type Category = components["schemas"]["Category"];
type AccountTransaction = components["schemas"]["AccountTransaction"];
type StatementImport = components["schemas"]["StatementImport"];
type CsvMapping = components["schemas"]["CsvMapping"];

type ImportedTransaction = components["schemas"]["ImportedTransaction"];
type Notification = components["schemas"]["Notification"];

/**
 * A row a Statement import brought in. A Suspected duplicate names the earlier
 * row it resembles by ID; the API shows that row as it is now.
 */
export type ImportedRow = Omit<ImportedTransaction, "resembles"> & { resembles_id?: string };

export interface MonthClose {
  statement_balance: components["schemas"]["Money"];
  closed_at: string;
}

export interface MockState {
  registered: boolean;
  households: Household[];
  /** Each Household's Accounts, by Household ID, in the order they were added. */
  accounts: Record<string, Account[]>;
  /** Each Account's Connections, by Account ID. */
  connections: Record<string, Connection[]>;
  /** Each Household's Categories, by Household ID, flat with `parent_id`. */
  categories: Record<string, Category[]>;
  /** Each Account's Transactions, by Account ID, in Booking date order. */
  transactions: Record<string, AccountTransaction[]>;
  /** Each Connection's Statement imports, by Connection ID, in the order recorded. */
  statementImports?: Record<string, StatementImport[]>;
  /** The fingerprint of each Statement import's file, by Statement import ID. */
  statementFiles?: Record<string, string>;
  /** Each Account's Imported transactions, by Account ID. */
  importedRows?: Record<string, ImportedRow[]>;
  /** Each Household's Notifications, by Household ID, newest first; `read` is the mock User's. */
  notifications?: Record<string, Notification[]>;
  /** Each Account's Month closes, by Account ID, then by month (`2026-03`). */
  monthCloses?: Record<string, Record<string, MonthClose>>;
  /**
   * The next `remaining` requests whose path ends with `pathEnd` (and that use
   * `method`, when given) fail with a 503.
   */
  failures?: { method?: string; pathEnd: string; remaining: number };
}

/** The one Invitation code the mock API accepts. */
export const validInvitationCode = "WELCOME-2026";

export const seededHousehold: Household = {
  household_id: "0190f5f2-7c00-7000-8000-000000000001",
  name: "Home",
  base_currency: "EUR",
};

/** A second Household, with no Accounts yet. */
export const secondHousehold: Household = {
  household_id: "0190f5f2-7c00-7000-8000-000000000002",
  name: "Cabin",
  base_currency: "USD",
};

export const seededAccounts: Account[] = [
  {
    account_id: "0190f5f2-7c00-7000-8000-000000000101",
    name: "Main",
    kind: "BANK_ACCOUNT",
    currency: "EUR",
    start_date: "2026-01-01",
    awaiting_first_statement_import: false,
    balance: { amount: "1234.50", currency: "EUR" },
    open_month: "2026-11",
    pending: 0,
    suspected_duplicates: 0,
  },
  {
    account_id: "0190f5f2-7c00-7000-8000-000000000102",
    name: "Credit card",
    kind: "CREDIT_CARD",
    currency: "EUR",
    start_date: "2026-11-01",
    awaiting_first_statement_import: true,
    open_month: "2026-11",
    pending: 0,
    suspected_duplicates: 0,
  },
  {
    account_id: "0190f5f2-7c00-7000-8000-000000000103",
    name: "Savings",
    kind: "BANK_ACCOUNT",
    currency: "EUR",
    start_date: "2026-08-01",
    awaiting_first_statement_import: false,
    balance: { amount: "1802.10", currency: "EUR" },
    open_month: "2026-10",
    pending: 0,
    suspected_duplicates: 0,
  },
];

let nextId = 0x300;
const id = () => `0190f5f2-7c00-7000-8000-${(nextId++).toString(16).padStart(12, "0")}`;

/** The Internal Categories every Household is created with. */
export function internalCategories(): Category[] {
  return ["Household transfer", "Opening balance", "Uncategorised"].map((name) => ({
    category_id: id(),
    name,
    kind: "INTERNAL",
  }));
}

function homeCategories(): Category[] {
  const food = id();
  const housing = id();
  return [
    ...internalCategories(),
    { category_id: food, name: "Food", kind: "EXPENSE" },
    { category_id: id(), name: "Groceries", kind: "EXPENSE", parent_id: food },
    { category_id: id(), name: "Eating out", kind: "EXPENSE", parent_id: food },
    { category_id: housing, name: "Housing", kind: "EXPENSE" },
    { category_id: id(), name: "Rent", kind: "EXPENSE", parent_id: housing },
    { category_id: id(), name: "Transport", kind: "EXPENSE" },
    { category_id: id(), name: "Salary", kind: "INCOME" },
  ];
}

const descriptions = [
  ["Albert Heijn", "Groceries"],
  ["Jumbo", "Groceries"],
  ["Café de Jaren", "Eating out"],
  ["NS Reizigers", "Transport"],
  ["Shell", "Transport"],
  ["Bol.com", "Uncategorised"],
  ["Tikkie from Sam", "Uncategorised"],
] as const;

const mainAccountId = "0190f5f2-7c00-7000-8000-000000000101";

/**
 * Main's Transactions: its Opening balance on 2026-01-01, then about two dozen
 * a month to November (more than one page of all months), with rent and salary
 * each month, some rows Uncategorised, and one reversed pair in October.
 */
function mainTransactions(categories: Category[]): AccountTransaction[] {
  const byName = (name: string) => {
    const found = categories.find((category) => category.name === name);
    if (found === undefined) {
      throw new Error(`No mock Category ${name}`);
    }
    return { category_id: found.category_id, category_name: found.name };
  };
  const row = (
    bookingDate: string,
    description: string,
    amount: string,
    category: string,
    extra: Partial<AccountTransaction> = {},
  ): AccountTransaction => ({
    transaction_id: id(),
    booking_date: bookingDate,
    transaction_date: bookingDate,
    description,
    amount: { amount: amount as AccountTransaction["amount"]["amount"], currency: "EUR" },
    ...byName(category),
    ...extra,
  });
  const rows = [row("2026-01-01", "Opening balance", "2500.00", "Opening balance")];
  for (let month = 1; month <= 11; month += 1) {
    const mm = String(month).padStart(2, "0");
    rows.push(row(`2026-${mm}-01`, "Rent", "-1150.00", "Rent"));
    for (let day = 2; day <= 23; day += 1) {
      const [description, category] =
        descriptions[(month * 3 + day) % descriptions.length] ?? descriptions[0];
      const cents = ((month * 37 + day * 53) % 9000) + 150;
      const dd = String(day).padStart(2, "0");
      rows.push(
        row(`2026-${mm}-${dd}`, description, `-${(cents / 100).toFixed(2)}`, category, {
          // Card payments are booked a day after the purchase.
          ...(day % 4 === 0
            ? { transaction_date: `2026-${mm}-${String(day - 1).padStart(2, "0")}` }
            : {}),
        }),
      );
    }
    rows.push(row(`2026-${mm}-25`, "Salary", "3200.00", "Salary"));
  }
  const original = row("2026-10-26", "Coolblue", "-249.00", "Uncategorised");
  const reversal = row("2026-10-27", "Reversal: Coolblue", "249.00", "Uncategorised", {
    reversal_of_transaction_id: original.transaction_id,
  });
  original.reversed_by_transaction_id = reversal.transaction_id;
  rows.push(original, reversal);
  return rows.sort((a, b) => a.booking_date.localeCompare(b.booking_date));
}

/**
 * The mapping of the mock bank's files: `Date;Description;Amount;Id`, a header
 * row, ISO dates and a signed amount with a decimal point.
 */
export const mockCsvMapping: CsvMapping = {
  encoding: "UTF_8",
  delimiter: ";",
  has_header_row: true,
  skip_leading_lines: 0,
  date_format: "YYYY-MM-DD",
  decimal_separator: ".",
  thousands_separator: "",
  amount_layout: "SIGNED",
  positive_amount_means: "MONEY_IN",
  columns: {
    booking_date: { header: "Date" },
    description: { header: "Description" },
    amount: { header: "Amount" },
    bank_transaction_id: { header: "Id" },
  },
};

/** Credit card has a Connection, with a mapping, but no Statement import yet. */
export const seededConnection: Connection = {
  connection_id: "0190f5f2-7c00-7000-8000-000000000201",
  name: "Card statements",
  account_id: "0190f5f2-7c00-7000-8000-000000000102",
  kind: "STATEMENT_FILE_IMPORT",
  csv_mapping: mockCsvMapping,
  csv_mapping_version: 1,
};

/**
 * Main has two Connections: "Connection 1", which its Statement imports came
 * through, and "Connection 2", made through the API without a mapping.
 */
export const mainConnections: Connection[] = [
  {
    connection_id: "0190f5f2-7c00-7000-8000-000000000202",
    name: "ING export",
    account_id: mainAccountId,
    kind: "STATEMENT_FILE_IMPORT",
    csv_mapping: mockCsvMapping,
    csv_mapping_version: 3,
  },
  {
    connection_id: "0190f5f2-7c00-7000-8000-000000000203",
    name: "Old export",
    account_id: mainAccountId,
    kind: "STATEMENT_FILE_IMPORT",
  },
];

/** Main's latest Statement import, through Connection 1, which brought `mainImportedRows`. */
export const mainStatementImport: StatementImport = {
  statement_import_id: "0190f5f2-7c00-7000-8000-000000000401",
  connection_id: "0190f5f2-7c00-7000-8000-000000000202",
  account_id: mainAccountId,
  export_balance: { amount: "1234.50", currency: "EUR" },
  rows_imported: 9,
  rows_skipped_as_certain_repeats: 0,
  suspected_duplicates: 1,
  rows_ignored_before_start_date: 0,
  rows_ignored_in_closed_months: 0,
  rows_total: { amount: "-315.50", currency: "EUR" },
  balance_check: "WAITING",
  imported_at: "2026-11-21T09:30:00Z",
  void_blocked_by: [],
};

function importedRow(
  number: number,
  bookingDate: string,
  description: string,
  amount: string,
  extra: Partial<ImportedRow> = {},
): ImportedRow {
  return {
    imported_transaction_id: `0190f5f2-7c00-7000-8000-0000000005${String(number).padStart(2, "0")}`,
    statement_import_id: mainStatementImport.statement_import_id,
    state: "PENDING",
    line: number + 1,
    booking_date: bookingDate,
    transaction_date: bookingDate,
    amount: { amount: amount as ImportedRow["amount"]["amount"], currency: "EUR" },
    description,
    bank_transaction_id: `NL-${bookingDate.slice(5).replace("-", "")}-${String(number).padStart(2, "0")}`,
    ...extra,
  };
}

/**
 * Main's Imported transactions, all in its open month, November 2026: two
 * Accepted on 2026-11-14 (Albert Heijn NL-1114-01, Shell NL-1114-02), six
 * Pending, and a Suspected duplicate of Shell.
 */
export const mainImportedRows: ImportedRow[] = [
  importedRow(1, "2026-11-02", "Ikea", "-89.00"),
  importedRow(2, "2026-11-14", "Albert Heijn", "-23.40", {
    state: "ACCEPTED",
    bank_transaction_id: "NL-1114-01",
  }),
  importedRow(3, "2026-11-14", "Shell", "-38.50", {
    state: "ACCEPTED",
    bank_transaction_id: "NL-1114-02",
  }),
  importedRow(4, "2026-11-14", "Shell Station 42", "-38.50", {
    state: "SUSPECTED_DUPLICATE",
    payee: "Shell",
    resembles_id: "0190f5f2-7c00-7000-8000-000000000503",
  }),
  importedRow(5, "2026-11-17", "Jumbo", "-12.35", { transaction_date: "2026-11-16" }),
  importedRow(6, "2026-11-18", "Bol.com order 4471", "-4.20", { payee: "Bol.com" }),
  importedRow(7, "2026-11-19", "Café de Jaren", "-18.00"),
  importedRow(8, "2026-11-20", "NS Reizigers", "-6.40"),
  importedRow(9, "2026-11-20", "Tikkie from Sam", "15.00"),
];

const savingsAccountId = "0190f5f2-7c00-7000-8000-000000000103";

/** Savings' one Connection, which its first import came through. */
export const savingsConnection: Connection = {
  connection_id: "0190f5f2-7c00-7000-8000-000000000204",
  name: "Savings statements",
  account_id: savingsAccountId,
  kind: "STATEMENT_FILE_IMPORT",
  csv_mapping: mockCsvMapping,
  csv_mapping_version: 1,
};

const savingsImport: StatementImport = {
  statement_import_id: "0190f5f2-7c00-7000-8000-000000000402",
  connection_id: savingsConnection.connection_id,
  account_id: savingsAccountId,
  export_balance: { amount: "1802.10", currency: "EUR" },
  rows_imported: 5,
  rows_skipped_as_certain_repeats: 0,
  suspected_duplicates: 0,
  rows_ignored_before_start_date: 0,
  rows_ignored_in_closed_months: 0,
  rows_total: { amount: "802.10", currency: "EUR" },
  opening_balance: { amount: "1000.00", currency: "EUR" },
  balance_check: "PASSED",
  imported_at: "2026-08-02T09:00:00Z",
  void_blocked_by: [],
};

function savingsRow(
  number: number,
  bookingDate: string,
  description: string,
  amount: string,
  extra: Partial<ImportedRow> = {},
): ImportedRow {
  return {
    imported_transaction_id: `0190f5f2-7c00-7000-8000-0000000007${String(number).padStart(2, "0")}`,
    statement_import_id: savingsImport.statement_import_id,
    state: "PENDING",
    line: number + 1,
    booking_date: bookingDate,
    transaction_date: bookingDate,
    amount: { amount: amount as ImportedRow["amount"]["amount"], currency: "EUR" },
    description,
    ...extra,
  };
}

const savingsTransactionId = (n: number) =>
  `0190f5f2-7c00-7000-8000-0000000008${String(n).padStart(2, "0")}`;

/**
 * Savings (start 2026-08-01): August and September closed, October open
 * (a deposit Accepted, Interest pending), November not open yet (a deposit
 * pending). Its months are for the Month close flows.
 */
function savingsData(categories: Category[]) {
  const category = (name: string) => {
    const found = categories.find((candidate) => candidate.name === name);
    if (found === undefined) {
      throw new Error(`No mock Category ${name}`);
    }
    return { category_id: found.category_id, category_name: found.name };
  };
  const deposits = ["2026-08-25", "2026-09-25", "2026-10-25"];
  const rows: ImportedRow[] = [
    ...deposits.map((date, index) =>
      savingsRow(index + 1, date, "Transfer from Main", "200.00", {
        state: "ACCEPTED",
        transaction_id: savingsTransactionId(index + 1),
      }),
    ),
    savingsRow(4, "2026-10-31", "Interest", "2.10"),
    savingsRow(5, "2026-11-05", "Transfer from Main", "200.00"),
  ];
  const ledger: AccountTransaction[] = [
    {
      transaction_id: savingsTransactionId(0),
      booking_date: "2026-08-01",
      transaction_date: "2026-08-01",
      description: "Opening balance",
      amount: { amount: "1000.00", currency: "EUR" },
      ...category("Opening balance"),
    },
    ...deposits.map((date, index) => ({
      transaction_id: savingsTransactionId(index + 1),
      booking_date: date,
      transaction_date: date,
      description: "Transfer from Main",
      amount: { amount: "200.00" as const, currency: "EUR" },
      imported_transaction_id: rows[index]?.imported_transaction_id ?? "",
      ...category("Salary"),
    })),
  ];
  const closes: Record<string, MonthClose> = {
    "2026-08": {
      statement_balance: { amount: "1200.00", currency: "EUR" },
      closed_at: "2026-09-02T18:00:00Z",
    },
    "2026-09": {
      statement_balance: { amount: "1400.00", currency: "EUR" },
      closed_at: "2026-10-03T18:00:00Z",
    },
  };
  return { rows, ledger, closes };
}

/**
 * Main's closed months, January to October 2026, each closed on the 2nd of
 * the next month with its computed balance as the Statement balance.
 */
function mainCloses(ledger: AccountTransaction[]): Record<string, MonthClose> {
  const closes: Record<string, MonthClose> = {};
  let cents = 0;
  for (let month = 1; month <= 10; month += 1) {
    const mm = `2026-${String(month).padStart(2, "0")}`;
    for (const { booking_date, amount } of ledger) {
      if (booking_date.startsWith(mm)) {
        cents += Math.round(Number(amount.amount) * 100);
      }
    }
    const next = month === 12 ? "2027-01" : `2026-${String(month + 1).padStart(2, "0")}`;
    closes[mm] = {
      statement_balance: {
        amount: (cents / 100).toFixed(2) as AccountTransaction["amount"]["amount"],
        currency: "EUR",
      },
      closed_at: `${next}-02T18:00:00Z`,
    };
  }
  return closes;
}

/**
 * Home's Notifications, newest first: Main's latest import found a Suspected
 * duplicate (unread), a kind this build doesn't know (unread), and an older
 * one already read.
 */
export const homeNotifications: Notification[] = [
  {
    notification_id: "0190f5f2-7c00-7000-8000-000000000601",
    kind: "SUSPECTED_DUPLICATES_FOUND",
    statement_import_id: mainStatementImport.statement_import_id,
    connection_id: mainStatementImport.connection_id,
    account_id: mainAccountId,
    suspected_duplicates: 1,
    created_at: "2026-11-21T09:30:01Z",
    read: false,
  },
  {
    notification_id: "0190f5f2-7c00-7000-8000-000000000602",
    kind: "BALANCE_CHECK_FAILED",
    statement_import_id: mainStatementImport.statement_import_id,
    connection_id: mainStatementImport.connection_id,
    account_id: mainAccountId,
    suspected_duplicates: 0,
    created_at: "2026-11-20T08:00:00Z",
    read: false,
  },
  {
    notification_id: "0190f5f2-7c00-7000-8000-000000000603",
    kind: "SUSPECTED_DUPLICATES_FOUND",
    statement_import_id: "0190f5f2-7c00-7000-8000-000000000400",
    connection_id: mainStatementImport.connection_id,
    account_id: mainAccountId,
    suspected_duplicates: 2,
    created_at: "2026-10-15T09:30:01Z",
    read: true,
  },
];

/**
 * Where a session starts: `new-user` has signed in but not redeemed an
 * Invitation, `registered` has no Household yet, `household` (the default) has
 * "Home" with two Accounts and "Cabin" with none.
 */
export const scenarios = {
  "new-user": () => ({
    registered: false,
    households: [],
    accounts: {},
    connections: {},
    categories: {},
    transactions: {},
  }),
  registered: () => ({
    registered: true,
    households: [],
    accounts: {},
    connections: {},
    categories: {},
    transactions: {},
  }),
  household: () => {
    const home = homeCategories();
    const main = mainTransactions(home);
    const savings = savingsData(home);
    return {
      registered: true,
      households: [seededHousehold, secondHousehold],
      accounts: { [seededHousehold.household_id]: seededAccounts },
      connections: {
        [seededConnection.account_id]: [seededConnection],
        [mainAccountId]: mainConnections,
        [savingsAccountId]: [savingsConnection],
      },
      statementImports: {
        [mainStatementImport.connection_id]: [mainStatementImport],
        [savingsConnection.connection_id]: [savingsImport],
      },
      importedRows: { [mainAccountId]: mainImportedRows, [savingsAccountId]: savings.rows },
      notifications: { [seededHousehold.household_id]: homeNotifications },
      categories: {
        [seededHousehold.household_id]: home,
        [secondHousehold.household_id]: internalCategories(),
      },
      transactions: { [mainAccountId]: main, [savingsAccountId]: savings.ledger },
      monthCloses: { [mainAccountId]: mainCloses(main), [savingsAccountId]: savings.closes },
    };
  },
} satisfies Record<string, () => MockState>;

export type Scenario = keyof typeof scenarios;

export function isScenario(value: unknown): value is Scenario {
  return typeof value === "string" && Object.hasOwn(scenarios, value);
}

export interface MockDb {
  read: () => MockState;
  write: (state: MockState) => void;
  reset: (scenario?: Scenario) => void;
}

const storageKey = "mock-api.db";

/** A mock db, kept in `storage` across reloads when one is given. */
export function createMockDb(storage?: Storage): MockDb {
  const load = (): MockState | undefined => {
    const saved = storage?.getItem(storageKey);
    return saved === null || saved === undefined ? undefined : (JSON.parse(saved) as MockState);
  };
  let state: MockState = load() ?? scenarios.household();
  const write = (next: MockState) => {
    state = next;
    storage?.setItem(storageKey, JSON.stringify(next));
  };
  return {
    read: () => state,
    write,
    reset: (scenario = "household") => {
      write(scenarios[scenario]());
    },
  };
}
