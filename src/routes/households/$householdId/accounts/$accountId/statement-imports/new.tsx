import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AccountTabStub } from "../../../../../../features/accounts/tab-stub";

export const Route = createFileRoute(
  "/households/$householdId/accounts/$accountId/statement-imports/new",
)({
  // `connection_id` skips choosing the Connection (ticket 12).
  validateSearch: z.object({ connection_id: z.string().optional().catch(undefined) }),
  component: () => <AccountTabStub page="newStatementImport" />,
});
