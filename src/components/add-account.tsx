import { createContext, use } from "react";

const OpenAddAccount = createContext<(() => void) | null>(null);

/**
 * Opens the Add Account dialog, from the sidebar or the Accounts overview. The
 * Household's layout route provides it, next to the dialog.
 */
export const AddAccountProvider = OpenAddAccount;

export function useOpenAddAccount(): () => void {
  const open = use(OpenAddAccount);
  if (open === null) {
    throw new Error("useOpenAddAccount needs the Household layout's AddAccountProvider");
  }
  return open;
}
