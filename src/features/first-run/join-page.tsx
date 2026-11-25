import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";
import { z } from "zod";

import { useApi } from "../../api/context";
import { errorStatus, isRegistrationRequired } from "../../api/problem";
import { FormAlert } from "../../components/form-alert";
import { Button } from "../../components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { saveLastHousehold } from "../../lib/last-household";
import { FirstRunCard } from "./first-run-card";

/**
 * Join a Household (spec, "Join page"): a User redeems an Invitation to a
 * Household with `createMembership`. `invitationCode` comes from an Invitation
 * link and only prefills: joining is always a press, never a side effect of
 * following a link.
 */
export function JoinPage({ invitationCode }: { invitationCode?: string | undefined }) {
  const { t } = useTranslation("firstRun");
  const auth = useAuth();
  const { api } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const codeId = useId();

  const schema = z.object({
    invitationCode: z
      .string()
      .trim()
      .min(1, t("register.codeRequired"))
      .max(256, t("register.codeTooLong")),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { invitationCode: invitationCode ?? "" },
  });
  const join = api.useMutation("post", "/memberships");

  // Joined: the Household is now the User's, and the one `/` goes back to.
  const goToHousehold = async (householdId: string) => {
    saveLastHousehold(householdId);
    await queryClient.invalidateQueries({ queryKey: ["get", "/households"] });
    await navigate({ to: "/households/$householdId", params: { householdId }, replace: true });
  };

  const profile = auth.user?.profile;
  const identity = profile?.email ?? profile?.preferred_username ?? profile?.sub ?? "";
  const codeError = form.formState.errors.invitationCode?.message;
  // `createMembership`'s only 409 is `already-a-member`: the User is in, by another way.
  const alreadyAMember = join.isError && errorStatus(join.error) === 409;

  return (
    <FirstRunCard title={t("join.title")} description={t("join.signedInAs", { identity })}>
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(({ invitationCode: code }) => {
            join.mutate(
              { body: { invitation_code: code } },
              {
                onSuccess: ({ household_id: householdId }) => void goToHousehold(householdId),
                onError: (error) => {
                  // Not a User after all: /register redeems the code instead.
                  if (isRegistrationRequired(error)) {
                    void navigate({
                      to: "/register",
                      search: { invitation_code: code },
                      replace: true,
                    });
                  }
                },
              },
            );
          })(event);
        }}
      >
        <FieldGroup>
          {join.isError && !isRegistrationRequired(join.error) && (
            <div className="grid gap-2">
              <FormAlert error={join.error} />
              {alreadyAMember && (
                <Link to="/" className="text-sm underline underline-offset-4">
                  {t("join.yourHouseholds")}
                </Link>
              )}
            </div>
          )}
          <Field data-invalid={codeError !== undefined}>
            <FieldLabel htmlFor={codeId}>{t("register.code")}</FieldLabel>
            <Input
              id={codeId}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={codeError !== undefined}
              aria-describedby={codeError === undefined ? undefined : `${codeId}-error`}
              {...form.register("invitationCode")}
            />
            {codeError !== undefined && <FieldError id={`${codeId}-error`}>{codeError}</FieldError>}
          </Field>
          <Button type="submit" disabled={join.isPending}>
            {join.isPending ? t("join.joining") : t("join.join")}
          </Button>
        </FieldGroup>
      </form>
    </FirstRunCard>
  );
}
