import { LogOutIcon } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { useMe } from "../../components/me";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { YourNameDialog } from "../../components/your-name-dialog";
import { OpenInvitations } from "./open-invitations";
import { LeaveHouseholdDialog } from "./leave-household-dialog";
import { RemoveMemberDialog, type Member } from "./remove-member-dialog";

/** When a member joined, as a date in the User's locale: "Mar 12, 2026". */
function joinedOn(dateTime: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(dateTime));
}

/**
 * The Members screen (spec, "Members screen"): every member of the Household,
 * oldest first as served, with your own row marked.
 */
export function MembersPage({ householdId }: { householdId: string }) {
  const { t } = useTranslation("members");
  const { api } = useApi();
  // The route's loader has fetched it already.
  const { data: members } = api.useSuspenseQuery("get", "/households/{household_id}/members", {
    params: { path: { household_id: householdId } },
  });
  // The shell has fetched it already.
  const { data: household } = api.useSuspenseQuery("get", "/households/{household_id}", {
    params: { path: { household_id: householdId } },
  });
  const me = useMe();
  const [yourNameOpen, setYourNameOpen] = useState(false);
  const [removing, setRemoving] = useState<Member>();
  const [leaving, setLeaving] = useState(false);
  const titleId = useId();
  const onlyMemberId = useId();
  const isOnlyMember = members.items.length === 1;
  const nameOf = (member: Member) =>
    member.display_name ?? t("members.unnamed", { date: joinedOn(member.joined_at) });

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 id={titleId} className="text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <div className="grid justify-items-end gap-1">
          <Button
            variant="outline"
            // Leaving needs your own User ID, from `GET /me`.
            disabled={isOnlyMember || me === undefined}
            aria-describedby={isOnlyMember ? onlyMemberId : undefined}
            onClick={() => {
              setLeaving(true);
            }}
          >
            <LogOutIcon aria-hidden="true" />
            {t("leave.open")}
          </Button>
          {isOnlyMember && (
            <p id={onlyMemberId} className="text-sm text-muted-foreground">
              {t("leave.onlyMember")}
            </p>
          )}
        </div>
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          <Table aria-labelledby={titleId}>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("members.columns.name")}</TableHead>
                <TableHead>{t("members.columns.joined")}</TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">{t("members.columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.items.map((member) => {
                const isYou = member.user_id === me?.user_id;
                return (
                  <TableRow key={member.user_id}>
                    <TableCell className="pl-4 whitespace-normal">
                      {member.display_name ?? (
                        <span className="text-muted-foreground">{t("members.noName")}</span>
                      )}
                      {isYou && ` ${t("members.you")}`}
                      {isYou && member.display_name === undefined && (
                        <>
                          {" "}
                          <Button
                            variant="link"
                            className="h-auto p-0"
                            onClick={() => {
                              setYourNameOpen(true);
                            }}
                          >
                            {t("members.setYourName")}
                          </Button>
                        </>
                      )}
                    </TableCell>
                    <TableCell>{joinedOn(member.joined_at)}</TableCell>
                    <TableCell className="pr-4 text-right">
                      {/* Until `GET /me` answers, your own row isn't known. */}
                      {me !== undefined && !isYou && (
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={t("remove.openNamed", { member: nameOf(member) })}
                          onClick={() => {
                            setRemoving(member);
                          }}
                        >
                          {t("remove.open")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <OpenInvitations householdId={householdId} />
      <YourNameDialog displayName={undefined} open={yourNameOpen} onOpenChange={setYourNameOpen} />
      <RemoveMemberDialog
        householdId={householdId}
        householdName={household.name}
        member={removing}
        memberName={removing === undefined ? "" : nameOf(removing)}
        onClose={() => {
          setRemoving(undefined);
        }}
      />
      {me !== undefined && (
        <LeaveHouseholdDialog
          householdId={householdId}
          householdName={household.name}
          userId={me.user_id}
          open={leaving}
          onOpenChange={setLeaving}
        />
      )}
    </div>
  );
}
