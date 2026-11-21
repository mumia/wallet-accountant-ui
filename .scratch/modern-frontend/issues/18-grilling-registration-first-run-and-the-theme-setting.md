# Grilling: registration, first run and the theme setting

Map: [A modern frontend for Wallet Accountant](../map.md)
Type: grilling
Status: resolved
Blocked by: 12

## Question

What do the first-run screens contain, and where is the theme chosen?

- `/register`: Redeem Invitation, and how the generic invalid-code error reads.
- `/households/new`: Create Household when the User has none.
- An Account's getting-started state ("Create a Connection → Import the first statement").
- Where the theme setting lives (User menu or a settings page) for choosing a preset and light or dark ([Prototype: look and feel](09-prototype-look-and-feel.md)).

Their routing is settled in [Grilling: screens and navigation for the first slice](08-grilling-screens-and-navigation-for-the-first-slice.md).

## Answer

Decided with the user on 2026-11-20, against `../wallet-accountant/api/openapi.yaml`.

### `/register` (Redeem Invitation)

- A centred card, no sidebar: "You're signed in as {email}, but you need an Invitation to use Wallet Accountant", one **Invitation code** field, a **Redeem** button, and a small **Sign out** link (wrong identity).
- Success, or a 409 (already a User), goes to `/`, which then routes to `/households/new`.
- The generic 422 for an unknown, expired, superseded or used code follows [Grilling: talking to the API](12-grilling-talking-to-the-api.md): the problem's `title` and `detail`, untranslated, in the form's alert. No special-case text; poor wording is fixed in the backend.
- `/register?invitation_code=…` prefills the field without submitting. The return URL (with the code) survives the sign-in round trip. Issuing Invitations stays outside the app.

### `/households/new` (Create Household)

- A centred card with a welcome line, **Name** (empty, placeholder "Home") and **Base currency**: a searchable combobox from `GET /currencies`, showing code and name ("EUR — Euro", the name from `Intl.DisplayNames`), with **no default**. Help text: "The currency your Household's totals are shown in. It can't be changed later."
- **Create Household** button and a **Sign out** link. Afterwards, the new Household's home.

### Empty Accounts overview

- With no Accounts, the table is replaced by an empty state: "Add your first Account. Each bank account or card you want to track is one Account." with **Add Account** (the existing dialog). The sidebar's Accounts section shows a small "Add Account" link.

### An Account's getting-started state

- The Account header and tabs stay, with no tab selected. The body is a two-step checklist:
  1. **Create a Connection** ("Tell us how your bank's statement files are laid out"), linking to `connections/new`; ✓ with its name once a Connection exists, still offering to add another.
  2. **Import the first statement** ("Use a file covering everything from {start date} to today. Its Export balance sets the Opening balance."), linking to `statement-imports/new`; disabled until step 1 is done.
- It stays until the first Statement import is done; then the Account's root redirects to Transactions, as decided.

### Theme setting

- **Appearance…** in the User menu opens a dialog: the four presets as swatches (Ledger, Teal, Ink, Warm) and **Light / Dark / System** (System follows `prefers-color-scheme`). Default stays Ledger + Dark. Changes apply live and are saved in the browser. No settings page until there is a second setting (e.g. language).
- `/register` and `/households/new` have no Appearance control; they use what is saved.

No backend changes.
