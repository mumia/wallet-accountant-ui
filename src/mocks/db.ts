// The mock API's data: who the signed-in identity is and what it owns. Tests
// keep it in memory; mock mode keeps it in sessionStorage, so a reload in the
// tab keeps a redeemed Invitation and a new Household.
import type { components } from "../api/schema.gen";

type Household = components["schemas"]["Household"];
type Account = components["schemas"]["Account"];
type Connection = components["schemas"]["Connection"];
type Category = components["schemas"]["Category"];

export interface MockState {
  registered: boolean;
  households: Household[];
  /** Each Household's Accounts, by Household ID, in the order they were added. */
  accounts: Record<string, Account[]>;
  /** Each Account's Connections, by Account ID. */
  connections: Record<string, Connection[]>;
  /** Each Household's Categories, by Household ID, flat with `parent_id`. */
  categories: Record<string, Category[]>;
  /** The next `remaining` requests whose path ends with `pathEnd` fail with a 503. */
  failures?: { pathEnd: string; remaining: number };
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
  }),
  registered: () => ({
    registered: true,
    households: [],
    accounts: {},
    connections: {},
    categories: {},
  }),
  household: () => ({
    registered: true,
    households: [seededHousehold, secondHousehold],
    accounts: { [seededHousehold.household_id]: seededAccounts },
    connections: { [seededConnection.account_id]: [seededConnection] },
    categories: {
      [seededHousehold.household_id]: homeCategories(),
      [secondHousehold.household_id]: internalCategories(),
    },
  }),
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
