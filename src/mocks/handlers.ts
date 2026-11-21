import { http } from "./http";

/** The default mock API. Tests add or replace handlers with `server.use(...)`. */
export const handlers = [
  http.get("/currencies", ({ response }) =>
    response(200).json({
      items: [
        { code: "EUR", decimal_places: 2 },
        { code: "ETH", decimal_places: 18 },
        { code: "JPY", decimal_places: 0 },
        { code: "USD", decimal_places: 2 },
      ],
    }),
  ),
];
