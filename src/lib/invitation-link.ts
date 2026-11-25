/**
 * The Invitation link the Invite dialog hands out (spec, "Invite dialog"):
 * `{origin}/join?invitation_code={code}`, which opens the Join page with the
 * code filled in. The code is URL-encoded, so any code survives the trip.
 */
export function invitationLink(origin: string, code: string): string {
  const url = new URL("/join", origin);
  url.searchParams.set("invitation_code", code);
  return url.href;
}
