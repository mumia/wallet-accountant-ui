import type { components } from "../api/schema.gen";
import { validInvitationCode, type MockDb } from "./db";
import { http } from "./http";

type Problem = components["schemas"]["Problem"];

// The backend's problems, word for word
// (../wallet-accountant/internal/households/adapters/http/handler.go).
const registrationRequired: Problem = {
  type: "/problems/registration-required",
  title: "Registration required",
  status: 403,
  detail: "Redeem an Invitation to become a User.",
};

const notFound: Problem = { type: "about:blank", title: "Not Found", status: 404 };

/** The mock API, over `db`. Tests add or replace handlers with `server.use(...)`. */
export function createHandlers(db: MockDb) {
  return [
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

    http.get("/me", ({ response }) =>
      db.read().registered
        ? response(200).json({
            user_id: "0190f5f2-7c00-7000-8000-0000000000aa",
            is_instance_administrator: false,
          })
        : response(403).json(registrationRequired),
    ),

    http.post("/registrations", async ({ request, response }) => {
      const state = db.read();
      if (state.registered) {
        return response(409).json({
          type: "/problems/already-registered",
          title: "Already registered",
          status: 409,
          detail: "This identity is already a User.",
        });
      }
      const { invitation_code } = await request.json();
      if (invitation_code !== validInvitationCode) {
        return response(422).json({
          type: "/problems/invalid-invitation",
          title: "Invalid Invitation code",
          status: 422,
          detail: "The Invitation code is unknown, expired, superseded or already used.",
        });
      }
      db.write({ ...state, registered: true });
      return response(201).json({
        user_id: "0190f5f2-7c00-7000-8000-0000000000aa",
        is_instance_administrator: false,
      });
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
      db.write({ ...state, households: [...state.households, household] });
      return response(201).json(household);
    }),

    http.get("/households/{household_id}", ({ params, response }) => {
      const state = db.read();
      const household = state.registered
        ? state.households.find(({ household_id }) => household_id === params.household_id)
        : undefined;
      return household === undefined ? response(404).json(notFound) : response(200).json(household);
    }),
  ];
}
