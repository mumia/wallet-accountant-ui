import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AccountArea } from "../../../../../features/accounts/account-area";
import { RecordTransactionProvider } from "../../../../../features/transactions/record-transaction-sheet";
import { loadAccount } from "../../../../../lib/account-query";

export const Route = createFileRoute("/households/$householdId/accounts/$accountId")({
  loader: async ({ context, params: { householdId, accountId } }) => {
    await loadAccount(context, householdId, accountId);
  },
  component: function Account() {
    const { householdId, accountId } = Route.useParams();
    // A cash Account's screens can open the Record a Transaction sheet.
    return (
      <RecordTransactionProvider householdId={householdId} accountId={accountId}>
        <AccountArea householdId={householdId} accountId={accountId}>
          <Outlet />
        </AccountArea>
      </RecordTransactionProvider>
    );
  },
});
