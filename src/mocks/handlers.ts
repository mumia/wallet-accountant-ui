import { HttpResponse } from "msw";

import { parseExactJson } from "../api/exact-json";
import type { components } from "../api/schema.gen";
import {
  householdInvitationCodes,
  householdMembers,
  internalCategories,
  mockUserId,
  validInvitationCode,
  type MockDb,
  type MockState,
} from "./db";
import { badRequest, http, withExactAmounts } from "./http";
import { withCounts } from "./months";
import { accountHandlers, checkOpeningCount, openingBalanceTransaction } from "./account-handlers";
import { connectionHandlers } from "./connection-handlers";
import { importedTransactionHandlers } from "./imported-transaction-handlers";
import { invitationByCode, invitationHandlers, withRedeemed } from "./invitation-handlers";
import { monthHandlers } from "./month-handlers";
import { statementImportHandlers } from "./statement-import-handlers";
import { transactionHandlers } from "./transaction-handlers";

type Problem = components["schemas"]["Problem"];
type Account = components["schemas"]["Account"];
type AccountCreation = components["schemas"]["AccountCreation"];
type Money = components["schemas"]["Money"];

// The backend's problems, word for word
// (../wallet-accountant/internal/households/adapters/http/handler.go).
const registrationRequired: Problem = {
  type: "/problems/registration-required",
  title: "Registration required",
  status: 403,
  detail: "Redeem an Invitation to become a User.",
};

/** The mock's one User. `displayName` is absent for one who registered before v0.4.0. */
const me = (displayName: string | undefined): components["schemas"]["Me"] => ({
  user_id: mockUserId,
  is_instance_administrator: false,
  ...(displayName === undefined ? {} : { display_name: displayName }),
});

const blankDisplayName: Problem = {
  type: "/problems/invalid-user",
  title: "Invalid User",
  status: 422,
  detail: "The display name must not be blank.",
};

const invalidInvitation: Problem = {
  type: "/problems/invalid-invitation",
  title: "Invalid Invitation code",
  status: 422,
  detail: "The Invitation code is unknown, expired, revoked, superseded or already used.",
};

type Household = components["schemas"]["Household"];

/**
 * The Household an unused Invitation code admits to, if it is one: a fixed
 * code, or the code of an open Invitation a member issued.
 */
function invitedHousehold(state: MockState, code: string): Household | undefined {
  return Object.hasOwn(householdInvitationCodes, code) && !state.redeemedCodes?.includes(code)
    ? householdInvitationCodes[code as keyof typeof householdInvitationCodes]
    : invitationByCode(state, code)?.household;
}

/** `state` with the mock User the newest member of `householdId`. */
function withMe(state: MockState, householdId: string): MockState {
  const others = householdMembers(state, householdId).filter(
    ({ user_id }) => user_id !== mockUserId,
  );
  const me = { user_id: mockUserId, joined_at: new Date().toISOString() };
  return { ...state, members: { ...state.members, [householdId]: [...others, me] } };
}

/** Join Household: the User becomes a member and the code is used up. */
function joined(state: MockState, code: string, household: Household): MockState {
  return {
    ...withMe(withRedeemed(state, code), household.household_id),
    households: [...state.households, household],
    categories: {
      ...state.categories,
      [household.household_id]: state.categories[household.household_id] ?? internalCategories(),
    },
    redeemedCodes: [...(state.redeemedCodes ?? []), code],
  };
}

const notFound: Problem = { type: "about:blank", title: "Not Found", status: 404 };

// (../wallet-accountant/internal/households/adapters/http/members.go)
const lastMember: Problem = {
  type: "/problems/last-member",
  title: "Last member",
  status: 409,
  detail: "The only member of a Household can't leave it.",
};

type Category = components["schemas"]["Category"];
type CategoryNode = components["schemas"]["CategoryNode"];

/** A Household's Categories, or undefined when the caller can't see the Household. */
function householdCategories(db: MockDb, householdId: string): Category[] | undefined {
  const state = db.read();
  const isMember =
    state.registered && state.households.some(({ household_id }) => household_id === householdId);
  return isMember ? (state.categories[householdId] ?? []) : undefined;
}

/** The flat list as the API's tree: roots and siblings sorted by name. */
function categoryTree(categories: Category[], parentId?: string): CategoryNode[] {
  return categories
    .filter((category) => category.parent_id === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((category) => {
      const children = categoryTree(categories, category.category_id);
      return children.length === 0 ? category : { ...category, children };
    });
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// The backend's problems, word for word
// (../wallet-accountant/internal/ledger/adapters/http/handler.go).
const categoryNameTaken: Problem = {
  type: "/problems/category-name-taken",
  title: "Category name taken",
  status: 409,
  detail: "Another Category under the same parent already has this name.",
};
const internalCategory: Problem = {
  type: "/problems/internal-category",
  title: "Internal Category",
  status: 422,
  detail:
    "Internal Categories belong to the system: they can't be created, renamed or moved, and nothing can be placed under them.",
};
const invalidCategory = (detail: string): Problem => ({
  type: "/problems/invalid-category",
  title: "Invalid Category",
  status: 422,
  detail,
});

/** A Household's Accounts, or undefined when the caller can't see the Household. */
function householdAccounts(db: MockDb, householdId: string) {
  const state = db.read();
  const isMember =
    state.registered && state.households.some(({ household_id }) => household_id === householdId);
  return isMember ? (state.accounts[householdId] ?? []) : undefined;
}

/**
 * Counts a read of a Household toward `removal`, and when none remain, a
 * member removes the mock User from it: it leaves their list of Households.
 */
function countTowardRemoval(db: MockDb, householdId: string): void {
  const { removal, ...state } = db.read();
  if (removal?.householdId !== householdId) {
    return;
  }
  db.write(
    removal.remaining > 0
      ? { ...state, removal: { ...removal, remaining: removal.remaining - 1 } }
      : {
          ...state,
          households: state.households.filter(({ household_id }) => household_id !== householdId),
        },
  );
}

/** The mock API, over `db`. Tests add or replace handlers with `server.use(...)`. */
export function createHandlers(db: MockDb) {
  return [
    // Injected failures (`db.read().failures`), for the screens' "Try again".
    http.untyped.all("*/api/*", ({ request }) => {
      const state = db.read();
      const { failures } = state;
      if (
        failures === undefined ||
        failures.remaining <= 0 ||
        (failures.method !== undefined && failures.method !== request.method) ||
        !new URL(request.url).pathname.endsWith(failures.pathEnd)
      ) {
        return undefined;
      }
      db.write({ ...state, failures: { ...failures, remaining: failures.remaining - 1 } });
      const problem: Problem = { type: "about:blank", title: "Service Unavailable", status: 503 };
      return HttpResponse.json(problem, { status: 503 });
    }),

    http.get("/currencies", ({ response }) =>
      response(200).json({
        items: [
          { code: "ETH", decimal_places: 18 },
          { code: "EUR", decimal_places: 2 },
          { code: "GBP", decimal_places: 2 },
          { code: "JPY", decimal_places: 0 },
          { code: "USD", decimal_places: 2 },
        ],
      }),
    ),

    http.get("/me", ({ response }) => {
      const state = db.read();
      return state.registered
        ? response(200).json(me(state.displayName))
        : response(403).json(registrationRequired);
    }),

    http.patch("/me", async ({ request, response }) => {
      const { display_name } = await request.json();
      // The request schema (1–64) first, as in the backend.
      if (display_name.length === 0 || display_name.length > 64) {
        return response.untyped(badRequest("Invalid value for: display_name."));
      }
      const state = db.read();
      if (!state.registered) {
        return response(403).json(registrationRequired);
      }
      const displayName = display_name.trim();
      if (displayName === "") {
        return response(422).json(blankDisplayName);
      }
      db.write({ ...state, displayName });
      return response(200).json(me(displayName));
    }),

    http.post("/registrations", async ({ request, response }) => {
      const { invitation_code, display_name } = await request.json();
      // The request schema (display_name required, 1–64) is checked before
      // anything else, as in the backend. A body from before v0.4.0 has none.
      if (
        typeof display_name !== "string" ||
        display_name.length === 0 ||
        display_name.length > 64
      ) {
        return response.untyped(badRequest("Invalid value for: display_name."));
      }
      const state = db.read();
      if (state.registered) {
        return response(409).json({
          type: "/problems/already-registered",
          title: "Already registered",
          status: 409,
          detail: "This identity is already a User.",
        });
      }
      const displayName = display_name.trim();
      if (displayName === "") {
        return response(422).json(blankDisplayName);
      }
      // An Invitation to a Household makes the new User a member of it too.
      const household = invitedHousehold(state, invitation_code);
      if (household !== undefined) {
        db.write(joined({ ...state, registered: true, displayName }, invitation_code, household));
        return response(201).json(me(displayName));
      }
      if (invitation_code !== validInvitationCode) {
        return response(422).json(invalidInvitation);
      }
      db.write({ ...state, registered: true, displayName });
      return response(201).json(me(displayName));
    }),

    http.post("/memberships", async ({ request, response }) => {
      const state = db.read();
      if (!state.registered) {
        return response(403).json(registrationRequired);
      }
      const { invitation_code } = await request.json();
      const household = invitedHousehold(state, invitation_code);
      if (household === undefined) {
        return response(422).json(invalidInvitation);
      }
      if (state.households.some(({ household_id }) => household_id === household.household_id)) {
        return response(409).json({
          type: "/problems/already-a-member",
          title: "Already a member",
          status: 409,
          detail:
            "You are already a member of this Household. The Invitation code is still unused.",
        });
      }
      db.write(joined(state, invitation_code, household));
      return response(201).json(household);
    }),

    http.get("/households", ({ response }) => {
      const state = db.read();
      return state.registered
        ? response(200).json({ items: state.households })
        : response(403).json(registrationRequired);
    }),

    http.post("/households", async ({ request, response }) => {
      const state = db.read();
      if (!state.registered) {
        return response(403).json(registrationRequired);
      }
      const { name, base_currency } = await request.json();
      if (name.trim() === "") {
        return response(422).json({
          type: "/problems/invalid-household",
          title: "Invalid Household",
          status: 422,
          detail: "The name must not be blank.",
        });
      }
      const household = { household_id: crypto.randomUUID(), name, base_currency };
      db.write({
        ...withMe(state, household.household_id),
        households: [...state.households, household],
        categories: { ...state.categories, [household.household_id]: internalCategories() },
      });
      return response(201).json(household);
    }),

    http.get("/households/{household_id}", ({ params, response }) => {
      countTowardRemoval(db, params.household_id);
      const state = db.read();
      const household = state.registered
        ? state.households.find(({ household_id }) => household_id === params.household_id)
        : undefined;
      return household === undefined ? response(404).json(notFound) : response(200).json(household);
    }),

    http.get("/households/{household_id}/members", ({ params, response }) => {
      const state = db.read();
      const isMember =
        state.registered &&
        state.households.some(({ household_id }) => household_id === params.household_id);
      if (!isMember) {
        return response(404).json(notFound);
      }
      const items = householdMembers(state, params.household_id).map(
        ({ display_name, ...member }) => {
          const name = member.user_id === mockUserId ? state.displayName : display_name;
          return name === undefined ? member : { ...member, display_name: name };
        },
      );
      return response(200).json({ items });
    }),

    http.delete("/households/{household_id}/members/{user_id}", ({ params, response }) => {
      const { household_id: householdId, user_id: userId } = params;
      let state = db.read();
      const isMember =
        state.registered &&
        state.households.some(({ household_id }) => household_id === householdId);
      if (!isMember) {
        return response(404).json(notFound);
      }
      if (state.othersLeave === true) {
        state = {
          ...state,
          othersLeave: false,
          members: {
            ...state.members,
            [householdId]: householdMembers(state, householdId).filter(
              ({ user_id }) => user_id === mockUserId,
            ),
          },
        };
        db.write(state);
      }
      const members = householdMembers(state, householdId);
      if (!members.some(({ user_id }) => user_id === userId)) {
        return response(404).json(notFound);
      }
      if (members.length === 1) {
        return response(409).json(lastMember);
      }
      const remaining = members.filter(({ user_id }) => user_id !== userId);
      db.write({
        ...state,
        members: { ...state.members, [householdId]: remaining },
        // Leaving takes the Household off the User's list.
        households:
          userId === mockUserId
            ? state.households.filter(({ household_id }) => household_id !== householdId)
            : state.households,
      });
      return response(204).empty();
    }),

    http.get("/households/{household_id}/accounts", async ({ params, response }) => {
      const accounts = householdAccounts(db, params.household_id);
      return accounts === undefined
        ? response(404).json(notFound)
        : response.untyped(
            await withExactAmounts(
              response(200).json({ items: accounts.map((item) => withCounts(db.read(), item)) }),
            ),
          );
    }),

    http.get("/households/{household_id}/categories", ({ params, response }) => {
      const categories = householdCategories(db, params.household_id);
      return categories === undefined
        ? response(404).json(notFound)
        : response(200).json({ items: categoryTree(categories) });
    }),

    http.post("/households/{household_id}/categories", async ({ params, request, response }) => {
      const categories = householdCategories(db, params.household_id);
      if (categories === undefined) {
        return response(404).json(notFound);
      }
      const { name, kind, parent_id } = await request.json();
      const parent = categories.find(({ category_id }) => category_id === parent_id);
      if (parent_id !== undefined && parent === undefined) {
        return response(422).json(invalidCategory("The parent Category doesn't exist."));
      }
      if (parent?.kind === "INTERNAL" || kind === "INTERNAL") {
        return response(422).json(internalCategory);
      }
      if (name.trim() === "") {
        return response(422).json(invalidCategory("The name must not be blank."));
      }
      const categoryKind = parent?.kind ?? kind;
      if (categoryKind === undefined) {
        return response(422).json(invalidCategory("A root Category needs a kind."));
      }
      if (categories.some((c) => c.parent_id === parent_id && sameName(c.name, name))) {
        return response(409).json(categoryNameTaken);
      }
      const category: Category = {
        category_id: crypto.randomUUID(),
        name: name.trim(),
        kind: categoryKind,
        ...(parent_id === undefined ? {} : { parent_id }),
      };
      const state = db.read();
      db.write({
        ...state,
        categories: { ...state.categories, [params.household_id]: [...categories, category] },
      });
      return response(201).json(category);
    }),

    http.patch(
      "/households/{household_id}/categories/{category_id}",
      async ({ params, request, response }) => {
        const categories = householdCategories(db, params.household_id);
        const category = categories?.find(({ category_id }) => category_id === params.category_id);
        if (categories === undefined || category === undefined) {
          return response(404).json(notFound);
        }
        if (category.kind === "INTERNAL") {
          return response(422).json(internalCategory);
        }
        const change = await request.json();
        const parentId =
          change.parent_id === undefined ? category.parent_id : (change.parent_id ?? undefined);
        const name = change.name?.trim() ?? category.name;
        if (parentId !== undefined) {
          const parent = categories.find(({ category_id }) => category_id === parentId);
          if (parent?.kind === "INTERNAL") {
            return response(422).json(internalCategory);
          }
          if (parent?.kind !== category.kind) {
            return response(422).json(
              invalidCategory("The new parent must be a Category of the same kind."),
            );
          }
          const tree = categoryTree(categories);
          const below = new Set<string>();
          const collect = (nodes: CategoryNode[], inside: boolean) => {
            for (const node of nodes) {
              const now = inside || node.category_id === category.category_id;
              if (now) {
                below.add(node.category_id);
              }
              collect(node.children ?? [], now);
            }
          };
          collect(tree, false);
          if (below.has(parentId)) {
            return response(422).json(
              invalidCategory("A Category can't move under itself or its sub-Categories."),
            );
          }
        }
        if (
          categories.some(
            (c) =>
              c.category_id !== category.category_id &&
              c.parent_id === parentId &&
              sameName(c.name, name),
          )
        ) {
          return response(409).json(categoryNameTaken);
        }
        const changed: Category = {
          category_id: category.category_id,
          kind: category.kind,
          name,
          ...(parentId === undefined ? {} : { parent_id: parentId }),
        };
        const state = db.read();
        db.write({
          ...state,
          categories: {
            ...state.categories,
            [params.household_id]: categories.map((c) =>
              c.category_id === changed.category_id ? changed : c,
            ),
          },
        });
        return response(200).json(changed);
      },
    ),

    http.get(
      "/households/{household_id}/accounts/{account_id}/transactions",
      async ({ params, query, response }) => {
        const account = householdAccounts(db, params.household_id)?.find(
          ({ account_id }) => account_id === params.account_id,
        );
        if (account === undefined) {
          return response(404).json(notFound);
        }
        const month = query.get("booking_month");
        const all = (db.read().transactions[params.account_id] ?? []).filter(
          (transaction) => month === null || transaction.booking_date.startsWith(month),
        );
        const start = Number(query.get("cursor") ?? "0");
        const limit = Math.min(Number(query.get("limit") ?? "50"), 200);
        const items = all.slice(start, start + limit);
        const next = start + limit < all.length ? String(start + limit) : undefined;
        return response.untyped(
          await withExactAmounts(
            response(200).json({ items, ...(next === undefined ? {} : { next_cursor: next }) }),
          ),
        );
      },
    ),

    http.post("/households/{household_id}/accounts", async ({ params, request, response }) => {
      const accounts = householdAccounts(db, params.household_id);
      if (accounts === undefined) {
        return response(404).json(notFound);
      }
      // The counts are exact JSON numbers: read them as text, never as JS numbers.
      const body = parseExactJson(await new Response(request.body).text()) as AccountCreation;
      const { name, kind, currency, start_date } = body;
      const invalid = (detail: string) =>
        response(422).json({
          type: "/problems/invalid-account",
          title: "Invalid Account",
          status: 422,
          detail,
        });
      if (name.trim() === "") {
        return invalid("The name must not be blank.");
      }
      const cash = kind === "CASH";
      const { opening_count: count, opening_count_confirmation: again } = body;
      if (!cash && (count !== undefined || again !== undefined)) {
        return invalid(
          "Only a cash Account takes an Opening count: a statement Account's first Statement import works out its Opening balance.",
        );
      }
      let opening: Money | undefined;
      if (cash) {
        const checked = checkOpeningCount(currency, count, again);
        if ("problem" in checked) {
          return response(422).json(checked.problem);
        }
        opening = checked.count;
      }
      const account: Account = {
        account_id: crypto.randomUUID(),
        name,
        kind,
        currency,
        start_date,
        // A cash Account's Opening balance comes from its count, at once.
        awaiting_first_statement_import: !cash,
        ...(opening === undefined ? {} : { balance: opening }),
        open_month: start_date.slice(0, 7),
        pending: 0,
        suspected_duplicates: 0,
      };
      const state = db.read();
      const recorded =
        opening === undefined
          ? undefined
          : openingBalanceTransaction(state, params.household_id, start_date, opening);
      db.write({
        ...state,
        accounts: { ...state.accounts, [params.household_id]: [...accounts, account] },
        ...(recorded === undefined
          ? {}
          : { transactions: { ...state.transactions, [account.account_id]: [recorded] } }),
      });
      return response.untyped(await withExactAmounts(response(201).json(account)));
    }),

    ...invitationHandlers(db),
    ...connectionHandlers(db),
    ...statementImportHandlers(db),
    ...importedTransactionHandlers(db),
    ...transactionHandlers(db),
    ...monthHandlers(db),
    ...accountHandlers(db),

    http.patch(
      "/households/{household_id}/accounts/{account_id}",
      async ({ params, request, response }) => {
        const accounts = householdAccounts(db, params.household_id);
        const account = accounts?.find(({ account_id }) => account_id === params.account_id);
        if (accounts === undefined || account === undefined) {
          return response(404).json(notFound);
        }
        const { name } = await request.json();
        // The request schema's bounds (1–200) come before the blank check, as in the backend.
        if (name.length === 0 || name.length > 200) {
          return response.untyped(badRequest("name must be 1 to 200 characters."));
        }
        if (name.trim() === "") {
          return response(422).json({
            type: "/problems/invalid-account",
            title: "Invalid Account",
            status: 422,
            detail: "The name must not be blank.",
          });
        }
        const renamed = { ...account, name: name.trim() };
        const state = db.read();
        db.write({
          ...state,
          accounts: {
            ...state.accounts,
            [params.household_id]: accounts.map((a) =>
              a.account_id === account.account_id ? renamed : a,
            ),
          },
        });
        return response.untyped(
          await withExactAmounts(response(200).json(withCounts(db.read(), renamed))),
        );
      },
    ),

    http.get("/households/{household_id}/accounts/{account_id}", async ({ params, response }) => {
      const account = householdAccounts(db, params.household_id)?.find(
        ({ account_id }) => account_id === params.account_id,
      );
      return account === undefined
        ? response(404).json(notFound)
        : response.untyped(
            await withExactAmounts(response(200).json(withCounts(db.read(), account))),
          );
    }),
  ];
}
