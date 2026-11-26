import { createFileRoute } from "@tanstack/react-router";

import { StatementImportPage } from "../../../../../../features/statement-import/statement-import-page";
import { newStatementImportSearch } from "../../../../../../lib/search";
import { redirectCashAccount } from "../../../../../../lib/account-query";

export const Route = createFileRoute(
  "/households/$householdId/accounts/$accountId/statement-imports/new",
)({
  // A cash Account has no statements: it goes to its Transactions.
  validateSearch: newStatementImportSearch,
  beforeLoad: ({ context, params }) => redirectCashAccount(context, params),
  loader: ({ context: { api, queryClient }, params: { householdId, accountId } }) =>
    Promise.all([
      queryClient.query(
        api.queryOptions("get", "/households/{household_id}/accounts/{account_id}/connections", {
          params: { path: { household_id: householdId, account_id: accountId } },
        }),
      ),
      queryClient.query(api.queryOptions("get", "/currencies")),
    ]),
  component: function NewStatementImport() {
    const { householdId, accountId } = Route.useParams();
    const { connection_id } = Route.useSearch();
    return (
      // A new `connection_id` ("Change" drops it) starts the flow over.
      <StatementImportPage
        key={connection_id ?? ""}
        householdId={householdId}
        accountId={accountId}
        linkedConnectionId={connection_id}
      />
    );
  },
});
