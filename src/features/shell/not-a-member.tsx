import { useQueryClient } from "@tanstack/react-query";
import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useApi } from "../../api/context";
import { LoadError } from "../../components/load-error";
import { MainLandmark } from "../../components/main-landmark";
import { forgetLastHousehold } from "../../lib/last-household";

/**
 * `GET /households/{id}` got 404: the User isn't a member of the Household
 * (spec, "Losing access"). It's an error, not the router's notFound(), because
 * a notFound() from a screen inside the Household (an unknown Account, say)
 * goes to the nearest route with a not-found component; this way those keep
 * their own "Not found" inside the shell.
 */
export class NotAMemberError extends Error {
  readonly householdId: string;

  constructor(householdId: string) {
    super(`Not a member of Household ${householdId}`);
    this.householdId = householdId;
    this.name = "NotAMemberError";
  }
}

/** The Household route's error screen: NotAMember for a NotAMemberError, else LoadError. */
export function HouseholdError(props: ErrorComponentProps) {
  return props.error instanceof NotAMemberError ? (
    <NotAMember householdId={props.error.householdId} />
  ) : (
    <LoadError {...props} />
  );
}

/**
 * A Household the User isn't a member of: the link is wrong, or a member
 * removed them, found on opening it or when the shell's Household query
 * refetches. `/` must not lead back here, so the Household is forgotten as the
 * last one opened and the list of Households is read again.
 */
function NotAMember({ householdId }: { householdId: string }) {
  const { t } = useTranslation("shell");
  const { api } = useApi();
  const queryClient = useQueryClient();

  useEffect(() => {
    forgetLastHousehold(householdId);
    void queryClient.invalidateQueries({
      queryKey: api.queryOptions("get", "/households").queryKey,
    });
  }, [api, queryClient, householdId]);

  return (
    <MainLandmark className="mx-auto grid max-w-xl gap-3 p-8">
      <h1 className="text-xl font-semibold">{t("notAMember.title")}</h1>
      <p className="text-muted-foreground">{t("notAMember.body")}</p>
      <p>
        <Link to="/" className="underline underline-offset-4">
          {t("notAMember.home")}
        </Link>
      </p>
    </MainLandmark>
  );
}
