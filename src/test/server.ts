import { setupServer } from "msw/node";

import { createMockDb } from "../mocks/db";
import { createHandlers } from "../mocks/handlers";

/** The mock API's data; reset to the default scenario after each test. */
export const mockDb = createMockDb();

/** The mock API every test runs against; unhandled requests fail the test. */
export const server = setupServer(...createHandlers(mockDb));
