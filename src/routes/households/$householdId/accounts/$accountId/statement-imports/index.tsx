import { createFileRoute } from "@tanstack/react-router";

import { statementImportsSearch } from "../../../../../../lib/search";
import { AccountTabStub } from "../../../../../../features/accounts/tab-stub";

export const Route = createFileRoute(
  "/households/$householdId/accounts/$accountId/statement-imports/",
)({
  validateSearch: statementImportsSearch,
  component: () => <AccountTabStub page="statementImports" />,
});
