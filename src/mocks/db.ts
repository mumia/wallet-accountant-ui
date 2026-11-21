// The mock API's data: who the signed-in identity is and what it owns. Tests
// keep it in memory; mock mode keeps it in sessionStorage, so a reload in the
// tab keeps a redeemed Invitation and a new Household.
import type { components } from "../api/schema.gen";

type Household = components["schemas"]["Household"];

export interface MockState {
  registered: boolean;
  households: Household[];
}

/** The one Invitation code the mock API accepts. */
export const validInvitationCode = "WELCOME-2026";

export const seededHousehold: Household = {
  household_id: "0190f5f2-7c00-7000-8000-000000000001",
  name: "Home",
  base_currency: "EUR",
};

/**
 * Where a session starts: `new-user` has signed in but not redeemed an
 * Invitation, `registered` has no Household yet, `household` (the default) has
 * one Household, "Home".
 */
export const scenarios = {
  "new-user": () => ({ registered: false, households: [] }),
  registered: () => ({ registered: true, households: [] }),
  household: () => ({ registered: true, households: [seededHousehold] }),
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
