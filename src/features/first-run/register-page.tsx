import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";
import { z } from "zod";

import { useApi } from "../../api/context";
import { errorStatus } from "../../api/problem";
import { FormAlert } from "../../components/form-alert";
import { Button } from "../../components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { displayNameSchema } from "../../lib/display-name";
import { FirstRunCard } from "./first-run-card";

/**
 * Redeem an Invitation (spec, "First run"): for someone signed in who isn't a
 * User yet. `invitationCode` comes from an Invitation link and only prefills.
 */
export function RegisterPage({ invitationCode }: { invitationCode?: string | undefined }) {
  const { t } = useTranslation("firstRun");
  const { t: tCommon } = useTranslation();
  const auth = useAuth();
  const { api } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const codeId = useId();
  const nameId = useId();

  const schema = z.object({
    invitationCode: z
      .string()
      .trim()
      .min(1, t("register.codeRequired"))
      .max(256, t("register.codeTooLong")),
    displayName: displayNameSchema({
      required: tCommon("displayName.required"),
      tooLong: tCommon("displayName.tooLong"),
    }),
  });
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { invitationCode: invitationCode ?? "", displayName: "" },
  });
  const redeem = api.useMutation("post", "/registrations");

  // Redeemed: `/` knows where to go next, which for an Invitation to a
  // Household is that Household, the User's only one.
  const goHome = async () => {
    await queryClient.invalidateQueries({ queryKey: ["get", "/households"] });
    await navigate({ to: "/", replace: true });
  };
  // Already a User (409): a User redeems an Invitation to a Household at /join.
  const goJoin = (code: string) =>
    navigate({ to: "/join", search: { invitation_code: code }, replace: true });

  const profile = auth.user?.profile;
  const identity = profile?.email ?? profile?.preferred_username ?? profile?.sub ?? "";
  const codeError = form.formState.errors.invitationCode?.message;
  const nameError = form.formState.errors.displayName?.message;
  const failure = redeem.isError && errorStatus(redeem.error) !== 409 ? redeem.error : undefined;

  return (
    <FirstRunCard title={t("register.title")} description={t("register.signedInAs", { identity })}>
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(({ invitationCode: code, displayName }) => {
            redeem.mutate(
              { body: { invitation_code: code, display_name: displayName } },
              {
                onSuccess: () => void goHome(),
                onError: (error) => {
                  if (errorStatus(error) === 409) {
                    void goJoin(code);
                  }
                },
              },
            );
          })(event);
        }}
      >
        <FieldGroup>
          {failure !== undefined && <FormAlert error={failure} />}
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
          <Field data-invalid={nameError !== undefined}>
            <FieldLabel htmlFor={nameId}>{tCommon("displayName.label")}</FieldLabel>
            <Input
              id={nameId}
              autoComplete="nickname"
              aria-invalid={nameError !== undefined}
              aria-describedby={nameError === undefined ? undefined : `${nameId}-error`}
              {...form.register("displayName")}
            />
            {nameError !== undefined && <FieldError id={`${nameId}-error`}>{nameError}</FieldError>}
          </Field>
          <Button type="submit" disabled={redeem.isPending}>
            {redeem.isPending ? t("register.redeeming") : t("register.redeem")}
          </Button>
        </FieldGroup>
      </form>
    </FirstRunCard>
  );
}
