import { describe, expect, it } from "vitest";

import { invitationLink } from "./invitation-link";

describe("invitationLink", () => {
  it("is the origin's /join with the code as invitation_code", () => {
    expect(invitationLink("https://wallet.example.com", "3q2-7wEAAAA_AA")).toBe(
      "https://wallet.example.com/join?invitation_code=3q2-7wEAAAA_AA",
    );
  });

  it("keeps the origin's port", () => {
    expect(invitationLink("http://localhost:4173", "WELCOME")).toBe(
      "http://localhost:4173/join?invitation_code=WELCOME",
    );
  });

  it("encodes characters a query can't hold as they are", () => {
    const link = invitationLink("https://wallet.example.com", "a+b/c=d&e f");
    expect(link).toBe("https://wallet.example.com/join?invitation_code=a%2Bb%2Fc%3Dd%26e+f");
    expect(new URL(link).searchParams.get("invitation_code")).toBe("a+b/c=d&e f");
  });
});
