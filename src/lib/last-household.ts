// The Household the User last opened in this browser, so `/` goes back to it
// (spec, "Screens and routes"). Like the appearance, storage may be missing or
// throw; then `/` goes to the first Household.
const storageKey = "wallet-accountant.last-household";

export function readLastHousehold(
  storage: () => Storage = () => window.localStorage,
): string | undefined {
  try {
    return storage().getItem(storageKey) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveLastHousehold(
  householdId: string,
  storage: () => Storage = () => window.localStorage,
): void {
  try {
    storage().setItem(storageKey, householdId);
  } catch {
    // Blocked storage: `/` goes to the first Household.
  }
}

/**
 * Forgets the last Household when it's `householdId`, the one the User lost
 * access to or left, so `/` doesn't go back to it.
 */
export function forgetLastHousehold(
  householdId: string,
  storage: () => Storage = () => window.localStorage,
): void {
  try {
    if (storage().getItem(storageKey) === householdId) {
      storage().removeItem(storageKey);
    }
  } catch {
    // Blocked storage remembers nothing.
  }
}
