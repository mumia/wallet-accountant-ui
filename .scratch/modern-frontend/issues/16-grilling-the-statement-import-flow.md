# Grilling: the Statement import flow

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: open
Blocked by: 12, 13, 15

## Question

How does each step of the Statement import flow work in detail?

The steps are fixed in [Grilling: screens and navigation for the first slice](08-grilling-screens-and-navigation-for-the-first-slice.md) and were prototyped in [Prototype: look and feel](09-prototype-look-and-feel.md). Decide: choosing or creating the Connection inline; the file picker; typing the Export balance twice on the first import (and what a mismatch looks like); the Opening balance preview and Confirm; the result screen; and how each refusal from the API (bad file, mapping mismatch, overlapping import, …) reads.

## Comments

**2026-11-20, from [Grilling: the CSV mapping editor](15-grilling-the-csv-mapping-editor.md):** Connections get a required name (⚠️ backend), so the Choose-the-Connection step lists them by name. "Create one" opens the full-page mapping editor, which returns to this flow after Save. Files may be Windows-1252 once the mapping carries an encoding.
