import { setupServer } from "msw/node";

import { handlers } from "../mocks/handlers";

/** The mock API every test runs against; unhandled requests fail the test. */
export const server = setupServer(...handlers);
