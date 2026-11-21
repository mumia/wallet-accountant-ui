// The mock API's data: who the signed-in identity is and what it owns. Tests
// keep it in memory; mock mode keeps it in sessionStorage, so a reload in the
// tab keeps a redeemed Invitation and a new Household.
import type { components } from "../api/schema.gen";

type Household = components["schemas"]["Household"];
type Account = components["schemas"]["Account"];
type Connection = components["schemas"]["Connection"];
type Category = components["schemas"]["Category"];
type AccountTransaction = components["schemas"]["AccountTransaction"];

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
  },
  {
    account_id: "0190f5f2-7c00-7000-8000-000000000102",
    name: "Credit card",
    kind: "CREDIT_CARD",
    currency: "EUR",
    start_date: "2026-11-01",
    awaiting_first_statement_import: true,
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

/** Credit card has a Connection but no Statement import yet. */
export const seededConnection: Connection = {
  connection_id: "0190f5f2-7c00-7000-8000-000000000201",
  account_id: "0190f5f2-7c00-7000-8000-000000000102",
  kind: "STATEMENT_FILE_IMPORT",
};

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
    return {
      registered: true,
      households: [seededHousehold, secondHousehold],
      accounts: { [seededHousehold.household_id]: seededAccounts },
      connections: { [seededConnection.account_id]: [seededConnection] },
      categories: {
        [seededHousehold.household_id]: home,
        [secondHousehold.household_id]: internalCategories(),
      },
      transactions: { [mainAccountId]: mainTransactions(home) },
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
