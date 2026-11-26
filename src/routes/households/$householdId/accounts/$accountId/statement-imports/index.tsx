import { createFileRoute } from "@tanstack/react-router";

import { StatementImportsTab } from "../../../../../../features/statement-import/statement-imports-tab";
import { statementImportsSearch } from "../../../../../../lib/search";
import { redirectCashAccount } from "../../../../../../lib/account-query";

export const Route = createFileRoute(
  "/households/$householdId/accounts/$accountId/statement-imports/",
)({
  // A cash Account has no statements: it goes to its Transactions.
  validateSearch: statementImportsSearch,
  beforeLoad: ({ context, params }) => redirectCashAccount(context, params),
  loader: ({ context: { api, queryClient }, params: { householdId, accountId } }) =>
    queryClient.query(
      api.queryOptions("get", "/households/{household_id}/accounts/{account_id}/connections", {
        params: { path: { household_id: householdId, account_id: accountId } },
      }),
    ),
  component: function StatementImports() {
    const { householdId, accountId } = Route.useParams();
    const { statement_import_id } = Route.useSearch();
    return (
      <StatementImportsTab
        householdId={householdId}
        accountId={accountId}
        highlighted={statement_import_id}
      />
    );
  },
});
