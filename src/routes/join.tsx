import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { isRegistrationRequired } from "../api/problem";
import { JoinPage } from "../features/first-run/join-page";

// An Invitation link to a Household: /join?invitation_code=…, which survives
// sign-in, like /register's.
const search = z.object({
  invitation_code: z.string().max(256).optional().catch(undefined),
});

export const Route = createFileRoute("/join")({
  validateSearch: search,
  // Someone who isn't a User yet redeems the code at /register instead, which
  // makes them a User and a member in one step.
  beforeLoad: async ({ context: { api, queryClient }, search: { invitation_code } }) => {
    try {
      await queryClient.query(api.queryOptions("get", "/me"));
    } catch (error) {
      if (isRegistrationRequired(error)) {
        throw redirect({
          to: "/register",
          search: invitation_code === undefined ? {} : { invitation_code },
          replace: true,
        });
      }
      throw error;
    }
  },
  component: function Join() {
    const { invitation_code } = Route.useSearch();
    return <JoinPage invitationCode={invitation_code} />;
  },
});
