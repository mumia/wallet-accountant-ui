// The mock API's Invitations (ADR-0025 in wallet-accountant): issue one,
// list the open ones without their codes, and revoke one. Redeeming a code is
// `POST /registrations` and `POST /memberships` in handlers.ts, which use
// `invitationByCode` and `withRedeemed` from here.
import type { components } from "../api/schema.gen";
import {
  householdInvitations,
  householdMembers,
  invitationLifetimeMs,
  invitingHousehold,
  isOpen,
  mockUserId,
  randomInvitationCode,
  secondHousehold,
  seededHousehold,
  type InvitationRecord,
  type MockDb,
  type MockState,
} from "./db";
import { http } from "./http";

type Problem = components["schemas"]["Problem"];
type Household = components["schemas"]["Household"];
type Invitation = components["schemas"]["Invitation"];

const notFound: Problem = { type: "about:blank", title: "Not Found", status: 404 };

const isMember = (state: MockState, householdId: string): boolean =>
  state.registered && state.households.some(({ household_id }) => household_id === householdId);

/** `state` with `householdId`'s Invitations replaced by `invitations`. */
function withInvitations(
  state: MockState,
  householdId: string,
  invitations: InvitationRecord[],
): MockState {
  return { ...state, invitations: { ...state.invitations, [householdId]: invitations } };
}

/** The open Invitation issued with `code`, and the Household it admits to, if there is one. */
export function invitationByCode(
  state: MockState,
  code: string,
): { household: Household; invitation: InvitationRecord } | undefined {
  const known = [...state.households, seededHousehold, secondHousehold, invitingHousehold];
  for (const [householdId, invitations] of Object.entries(state.invitations ?? {})) {
    const invitation = invitations.find((candidate) => candidate.code === code);
    const household = known.find(({ household_id }) => household_id === householdId);
    if (invitation !== undefined && household !== undefined && isOpen(invitation)) {
      return { household, invitation };
    }
  }
  return undefined;
}

/** `state` with the Invitation issued with `code` redeemed: it is no longer open. */
export function withRedeemed(state: MockState, code: string): MockState {
  const found = invitationByCode(state, code);
  if (found === undefined) {
    return state;
  }
  const householdId = found.household.household_id;
  return withInvitations(
    state,
    householdId,
    householdInvitations(state, householdId).map((invitation) =>
      invitation === found.invitation ? { ...invitation, closed: "redeemed" } : invitation,
    ),
  );
}

/** An open Invitation as the API lists it: who issued it, by their name as it is now, and no code. */
function listed(state: MockState, householdId: string, record: InvitationRecord): Invitation {
  const name =
    record.issued_by === mockUserId
      ? state.displayName
      : householdMembers(state, householdId).find(({ user_id }) => user_id === record.issued_by)
          ?.display_name;
  return {
    invitation_id: record.invitation_id,
    issued_by: {
      user_id: record.issued_by,
      ...(name === undefined ? {} : { display_name: name }),
    },
    issued_at: record.issued_at,
    expires_at: record.expires_at,
  };
}

export function invitationHandlers(db: MockDb) {
  const invitationsPath = "/households/{household_id}/invitations";
  return [
    http.post(invitationsPath, ({ params, request, response }) => {
      const state = db.read();
      if (!isMember(state, params.household_id)) {
        return response(404).json(notFound);
      }
      const invitations = householdInvitations(state, params.household_id);
      const key = request.headers.get("Idempotency-Key") ?? undefined;
      // A replay with the same Idempotency-Key returns the same code.
      const replayed =
        key === undefined
          ? undefined
          : invitations.find(({ idempotency_key }) => idempotency_key === key);
      const issuedAt = new Date();
      const invitation: InvitationRecord = replayed ?? {
        invitation_id: crypto.randomUUID(),
        code: randomInvitationCode(),
        issued_by: mockUserId,
        issued_at: issuedAt.toISOString(),
        expires_at: new Date(issuedAt.getTime() + invitationLifetimeMs).toISOString(),
        ...(key === undefined ? {} : { idempotency_key: key }),
      };
      if (replayed === undefined) {
        db.write(withInvitations(state, params.household_id, [...invitations, invitation]));
      }
      return response(201).json({
        invitation_id: invitation.invitation_id,
        code: invitation.code,
        expires_at: invitation.expires_at,
      });
    }),

    http.get(invitationsPath, ({ params, response }) => {
      const state = db.read();
      if (!isMember(state, params.household_id)) {
        return response(404).json(notFound);
      }
      // Oldest first, as issued; expired ones drop out of the list.
      const items = householdInvitations(state, params.household_id)
        .filter((invitation) => isOpen(invitation))
        .map((invitation) => listed(state, params.household_id, invitation));
      return response(200).json({ items });
    }),

    http.delete(`${invitationsPath}/{invitation_id}`, ({ params, response }) => {
      const state = db.read();
      if (!isMember(state, params.household_id)) {
        return response(404).json(notFound);
      }
      const invitations = householdInvitations(state, params.household_id);
      const invitation = invitations.find(
        ({ invitation_id }) => invitation_id === params.invitation_id,
      );
      // Redeemed, revoked or expired: no longer open.
      if (invitation === undefined || !isOpen(invitation)) {
        return response(404).json(notFound);
      }
      db.write(
        withInvitations(
          state,
          params.household_id,
          invitations.map((candidate) =>
            candidate === invitation ? { ...candidate, closed: "revoked" } : candidate,
          ),
        ),
      );
      return response(204).empty();
    }),
  ];
}
