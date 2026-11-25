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
  const me = useMe();
  const [yourNameOpen, setYourNameOpen] = useState(false);
  const titleId = useId();

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 id={titleId} className="text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
      </div>
      <Card className="py-0">
        <CardContent className="px-0">
          <Table aria-labelledby={titleId}>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("members.columns.name")}</TableHead>
                <TableHead className="pr-4">{t("members.columns.joined")}</TableHead>
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
                    <TableCell className="pr-4">{joinedOn(member.joined_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <OpenInvitations householdId={householdId} />
      <YourNameDialog displayName={undefined} open={yourNameOpen} onOpenChange={setYourNameOpen} />
    </div>
  );
}
