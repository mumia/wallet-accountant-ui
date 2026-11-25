import { CircleAlertIcon } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import type { components } from "../../api/schema.gen";
import { useErrorText } from "../../components/error-text";
import { useMe } from "../../components/me";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { dateAndTime } from "./invitation-dates";
import { InviteDialog } from "./invite-dialog";
import { RevokeInvitationDialog } from "./revoke-invitation-dialog";

type Invitation = components["schemas"]["Invitation"];

/**
 * The Members screen's Open Invitations (spec, "Members screen"): who issued
 * each and when it expires, never its code, with Revoke… on each row and
 * Invite someone. The backend leaves expired ones out, so the list is shown as
 * served and kept fresh by refetching.
 */
export function OpenInvitations({ householdId }: { householdId: string }) {
  const { t } = useTranslation("members");
  const { api } = useApi();
  const params = { path: { household_id: householdId } };
  // The Household route has read it already.
  const { data: household } = api.useSuspenseQuery("get", "/households/{household_id}", {
    params,
  });
  const invitations = api.useQuery("get", "/households/{household_id}/invitations", { params });
  const me = useMe();
  const [inviting, setInviting] = useState(false);
  const [revoking, setRevoking] = useState<Invitation>();
  const titleId = useId();

  const issuer = ({ issued_by }: Invitation) =>
    issued_by.user_id === me?.user_id
      ? t("invitations.you")
      : (issued_by.display_name ?? t("invitations.noName"));

  return (
    <section aria-labelledby={titleId} className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {t("invitations.title")}
        </h2>
        <Button
          onClick={() => {
            setInviting(true);
          }}
        >
          {t("invitations.invite")}
        </Button>
      </div>
      {invitations.isError ? (
        <LoadFailed
          error={invitations.error}
          onRetry={() => {
            void invitations.refetch();
          }}
        />
      ) : invitations.data === undefined ? (
        <Skeleton className="h-24" />
      ) : invitations.data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("invitations.empty")}</p>
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table aria-labelledby={titleId}>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">{t("invitations.columns.issuedBy")}</TableHead>
                  <TableHead>{t("invitations.columns.issued")}</TableHead>
                  <TableHead>{t("invitations.columns.expires")}</TableHead>
                  <TableHead className="pr-4">
                    <span className="sr-only">{t("invitations.columns.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.data.items.map((invitation) => {
                  const name = issuer(invitation);
                  const isNamed =
                    invitation.issued_by.user_id === me?.user_id ||
                    invitation.issued_by.display_name !== undefined;
                  return (
                    <TableRow key={invitation.invitation_id}>
                      <TableCell className="pl-4 whitespace-normal">
                        {isNamed ? name : <span className="text-muted-foreground">{name}</span>}
                      </TableCell>
                      <TableCell>{dateAndTime(invitation.issued_at)}</TableCell>
                      <TableCell>{dateAndTime(invitation.expires_at)}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRevoking(invitation);
                          }}
                        >
                          {t("invitations.revoke")}
                          <span className="sr-only">
                            {" "}
                            {t("invitations.revokeFor", {
                              issuer: name,
                              issued: dateAndTime(invitation.issued_at),
                            })}
                          </span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <InviteDialog
        householdId={householdId}
        householdName={household.name}
        open={inviting}
        onOpenChange={setInviting}
      />
      <RevokeInvitationDialog
        householdId={householdId}
        invitation={revoking}
        onClose={() => {
          setRevoking(undefined);
        }}
      />
    </section>
  );
}

function LoadFailed({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  const { title, detail } = useErrorText(error);
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      {detail !== undefined && <AlertDescription>{detail}</AlertDescription>}
      <AlertAction>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("errors.tryAgain")}
        </Button>
      </AlertAction>
    </Alert>
  );
}
