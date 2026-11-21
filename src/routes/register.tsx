import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { RegisterPage } from "../features/first-run/register-page";

// An Invitation link: /register?invitation_code=…, which survives sign-in.
const search = z.object({
  invitation_code: z.string().max(256).optional().catch(undefined),
});

export const Route = createFileRoute("/register")({
  validateSearch: search,
  component: function Register() {
    const { invitation_code } = Route.useSearch();
    return <RegisterPage invitationCode={invitation_code} />;
  },
});
