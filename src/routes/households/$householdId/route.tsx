import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { errorStatus } from "../../../api/problem";
import { AddAccountProvider } from "../../../components/add-account";
import { AddAccountDialog } from "../../../features/accounts/add-account-dialog";
import { HouseholdShell } from "../../../features/shell/household-shell";
import { HouseholdError, NotAMemberError } from "../../../features/shell/not-a-member";

export const Route = createFileRoute("/households/$householdId")({
  loader: async ({ context: { api, queryClient }, params: { householdId } }) => {
    const path = { params: { path: { household_id: householdId } } };
    // For Create Household; the shell doesn't wait for it, and its form shows a failure.
    queryClient.query(api.queryOptions("get", "/currencies")).catch(() => undefined);
    try {
      await Promise.all([
        queryClient.query(api.queryOptions("get", "/households/{household_id}", path)),
        queryClient.query(api.queryOptions("get", "/households")),
        queryClient.query(api.queryOptions("get", "/households/{household_id}/accounts", path)),
      ]);
    } catch (error) {
      if (errorStatus(error) === 404) {
        throw new NotAMemberError(householdId);
      }
      throw error;
    }
  },
  // A 404 here, or on the shell's refetch of the Household, means the User isn't a member.
  errorComponent: HouseholdError,
  component: function HouseholdLayout() {
    const { householdId } = Route.useParams();
    const [addingAccount, setAddingAccount] = useState(false);
    return (
      <AddAccountProvider
        value={() => {
          setAddingAccount(true);
        }}
      >
        <HouseholdShell householdId={householdId}>
          <Outlet />
        </HouseholdShell>
        <AddAccountDialog
          householdId={householdId}
          open={addingAccount}
          onOpenChange={setAddingAccount}
        />
      </AddAccountProvider>
    );
  },
});
