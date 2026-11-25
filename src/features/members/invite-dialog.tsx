import { useQueryClient } from "@tanstack/react-query";
import { CopyIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import type { components } from "../../api/schema.gen";
import { FormAlert } from "../../components/form-alert";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { invitationLink } from "../../lib/invitation-link";
import { dateAndTime } from "./invitation-dates";

type IssuedInvitation = components["schemas"]["IssuedInvitation"];

/**
 * Invite someone (spec, "Invite dialog"): step 1 asks before issuing an
 * Invitation; step 2 shows its link and code, the only time the code is ever
 * shown. Closing the dialog refreshes the open Invitations. The request goes
 * through the client's write middleware, so it carries an Idempotency-Key and a
 * retry gets the same code.
 */
export function InviteDialog({
  householdId,
  householdName,
  open,
  onOpenChange,
}: {
  householdId: string;
  householdName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("members");
  const { api } = useApi();
  const queryClient = useQueryClient();
  const params = { path: { household_id: householdId } };
  const invitationsKey = api.queryOptions("get", "/households/{household_id}/invitations", {
    params,
  }).queryKey;
  const refreshList = () => queryClient.invalidateQueries({ queryKey: invitationsKey });
  // Refreshes the list itself too, in case the dialog closed while it was issuing.
  const create = api.useMutation("post", "/households/{household_id}/invitations", {
    onSuccess: () => {
      void refreshList();
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          void refreshList();
        }
        onOpenChange(next);
      }}
      onOpenChangeComplete={(next) => {
        // Once closed, the next opening starts again at step 1.
        if (!next) {
          create.reset();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("invitations.inviteDialog.title", { household: householdName })}
          </DialogTitle>
          <DialogDescription>
            {create.data === undefined
              ? t("invitations.inviteDialog.description")
              : t("invitations.inviteDialog.warning", {
                  expires: dateAndTime(create.data.expires_at),
                })}
          </DialogDescription>
        </DialogHeader>
        {create.data === undefined ? (
          <>
            {create.isError && <FormAlert error={create.error} />}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {t("invitations.inviteDialog.cancel")}
              </DialogClose>
              <Button
                disabled={create.isPending}
                onClick={() => {
                  create.mutate({ params });
                }}
              >
                {create.isPending
                  ? t("invitations.inviteDialog.creating")
                  : t("invitations.inviteDialog.create")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <IssuedCode invitation={create.data} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Step 2: the Invitation link and the bare code, each with a copy button. */
function IssuedCode({ invitation }: { invitation: IssuedInvitation }) {
  const { t } = useTranslation("members");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  // Emptied first, so a second copy is announced again.
  const announceCopied = () => {
    setCopied(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(true);
    }, 100);
  };

  return (
    <>
      <FieldGroup>
        <CopyField
          label={t("invitations.inviteDialog.link")}
          copyLabel={t("invitations.inviteDialog.copyLink")}
          value={invitationLink(window.location.origin, invitation.code)}
          onCopied={announceCopied}
        />
        <CopyField
          label={t("invitations.inviteDialog.code")}
          copyLabel={t("invitations.inviteDialog.copyCode")}
          value={invitation.code}
          onCopied={announceCopied}
        />
      </FieldGroup>
      <p role="status" className="min-h-5 text-sm text-muted-foreground">
        {copied ? t("invitations.inviteDialog.copied") : ""}
      </p>
      <DialogFooter>
        <DialogClose render={<Button />}>{t("invitations.inviteDialog.done")}</DialogClose>
      </DialogFooter>
    </>
  );
}

/**
 * A read-only field with a copy button. Copying uses the Clipboard API; where
 * there is none (or it refuses), the field's text is selected instead, for the
 * User to copy by hand.
 */
export function CopyField({
  label,
  copyLabel,
  value,
  onCopied,
}: {
  label: string;
  copyLabel: string;
  value: string;
  onCopied: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const select = () => {
    input.current?.focus();
    input.current?.select();
  };
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex gap-2">
        <Input
          id={id}
          ref={input}
          readOnly
          value={value}
          className="font-mono"
          onFocus={(event) => {
            event.currentTarget.select();
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            // Missing outside a secure context, whatever the DOM types say.
            const { clipboard } = navigator as Partial<Navigator>;
            if (clipboard === undefined) {
              select();
              return;
            }
            clipboard.writeText(value).then(onCopied, select);
          }}
        >
          <CopyIcon aria-hidden="true" />
          {copyLabel}
        </Button>
      </div>
    </Field>
  );
}
