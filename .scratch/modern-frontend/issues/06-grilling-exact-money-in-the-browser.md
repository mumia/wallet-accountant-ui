# Grilling: exact money in the browser

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: open
Blocked by: 02

## Question

How does exact decimal money (backend ADR-0007: EUR 2 places, JPY 0, BTC 8, ETH 18) survive the trip into and out of the browser?

Today `Money.amount` is a JSON `number` with `format: decimal`, which a browser parses into a float. Decide: whether the contract changes to send amounts as strings (a backend change), or the UI parses JSON specially; which decimal library the UI uses for arithmetic and comparison (if any arithmetic happens in the UI at all); how amounts are formatted per locale and currency (`Intl.NumberFormat`); and how a User types an amount (decimal separator by locale, sign, currency places).
