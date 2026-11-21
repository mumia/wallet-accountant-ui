# Grilling: exact money in the browser

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by: 02

## Question

How does exact decimal money (backend ADR-0007: EUR 2 places, JPY 0, BTC 8, ETH 18) survive the trip into and out of the browser?

Today `Money.amount` is a JSON `number` with `format: decimal`, which a browser parses into a float. Decide: whether the contract changes to send amounts as strings (a backend change), or the UI parses JSON specially; which decimal library the UI uses for arithmetic and comparison (if any arithmetic happens in the UI at all); how amounts are formatted per locale and currency (`Intl.NumberFormat`); and how a User types an amount (decimal separator by locale, sign, currency places).

## Answer

Decided with the user on 2026-11-17, building on [Research: typed API client from OpenAPI](02-research-typed-api-client-from-openapi.md) and on facts checked in the backend: `Money.amount` is the contract's only `format: decimal` field; the backend rejects a JSON string amount with 400 (ADR-0012); multipart uploads already use `DecimalText` strings for the Export balance; the backend's currency table (`internal/sharedkernel/currency.go`) is not exposed by the API.

**On the wire: `Money.amount` stays a JSON number.** The contract doesn't change.
- Amounts as strings: rejected by the user.
- Integer minor units plus a scale: rejected. A JSON integer is still a float in the browser (exact only to ~9 × 10¹⁵, so ETH above ~0.009 loses digits), and Go's `int64` overflows at ~9.2 ETH, which is why ADR-0007 ruled out minor units.

**In the UI, an amount is never a JS `number`:**
- **Generated types:** the generator maps `format: decimal` to a plain decimal-string alias, not a branded type, because openapi-fetch distorts branded strings.
- **Receiving:** one API-client middleware parses responses with a `JSON.parse` reviver that reads `context.source`, so each `amount` keeps its exact text, trailing zeros included.
- **Sending:** requests are serialised with `JSON.rawJSON`, so amounts go out as exact JSON numbers.
- **Tests:** they pin `1.000000000000000001` ETH and `100.00` EUR both ways.
- **Boundary:** only the money module touches an amount's raw value.
- **Browser support:** the app needs JSON source text access, which is Baseline 2025 (Chrome/Edge 114, Firefox 135, Safari 18.4). The UI detects the feature at start-up and shows an "unsupported browser" screen instead of risking a wrong amount.

**Currency decimal places** come from a new `GET /currencies` endpoint (see Backend changes). The UI uses it for the Account currency picker and to validate typed amounts. Display needs no lookup, because returned amounts always carry their currency's places.

**Arithmetic:** `big.js` is allowed, but only inside the money module and only for figures shown to the User, never for anything sent to the server. Example: the live difference between the computed closing balance and the Statement balance being typed at Month close. Every figure that matters is computed by the server.

**Typing an amount:** one shared amount input, built by us because neither design system's number input is exact to 18 places.
- **Field:** a text field with `inputMode="decimal"`, not `type="number"`.
- **Accepts:** the locale's decimal and grouping separators, and a leading minus. The sign is typed, with no in/out toggle.
- **Refuses:** more decimal places than the currency has, with an inline error.
- **Stores:** the canonical `DecimalText` form (`-1234.56`). The value is formatted when the field loses focus.
- **Export balance:** typed twice, and the two entries are checked for a match before upload.

**Display:**
- **Format:** `Intl.NumberFormat` in the User's locale, always showing the currency's decimal places (`€1,234.50`, `¥1,235`, `ETH 1.000000000000000000`), and fed the decimal string so formatting is exact.
- **Negatives:** a plain minus, no brackets.
- **Colour:** none for income and expense; colour only marks differences and mismatches.
- **Tables:** amounts right-aligned with tabular (equal-width) digits.

## Backend changes

- **New endpoint `GET /currencies`:** returns every known currency code with its number of decimal places (`[{code, decimal_places}]`), read from the existing table in `internal/sharedkernel/currency.go`. Any signed-in User may call it; no Household scope.
