import { describe, expect, it } from "vitest";

import { shouldRetryRead, shouldRetryWrite } from "./retry";

const problem = (status: number) => ({ type: "about:blank", title: "", status });
const network = new TypeError("Failed to fetch");

describe("retries", () => {
  it.each([
    ["a network error", network, true],
    ["a 500", problem(500), true],
    ["a 503", problem(503), true],
    ["a 404", problem(404), false],
    ["a 422", problem(422), false],
  ])("reads retry after %s: %s", (_name, error, retry) => {
    expect(shouldRetryRead(0, error)).toBe(retry);
  });

  it.each([
    ["a network error", network, true],
    ["a 502", problem(502), true],
    ["a 503", problem(503), true],
    ["a 504", problem(504), true],
    ["a 500", problem(500), false],
    ["a 409", problem(409), false],
  ])("writes retry after %s: %s", (_name, error, retry) => {
    expect(shouldRetryWrite(0, error)).toBe(retry);
  });

  it("stops: reads after three attempts, writes after two retries", () => {
    expect(shouldRetryRead(3, network)).toBe(false);
    expect(shouldRetryWrite(1, network)).toBe(true);
    expect(shouldRetryWrite(2, network)).toBe(false);
  });
});
