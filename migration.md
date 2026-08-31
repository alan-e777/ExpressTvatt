# migration.md — website ↔ app divergences

The website (`app/`) ships continuously; the iOS app (`skraddare-app/`) is **not in use
yet**, so most work lands on the web only and `CLAUDE.md` says to leave the app alone
unless asked. This file is the debt ledger for that choice: every place where the two
sides now behave differently, and what it would take to close the gap.

**Before the app launches, read this file top to bottom and work the open items.**

## How to use it

- **Owner:** treat the open items as the pre-launch checklist for the app. Each entry says
  what the customer would actually experience if it ships as-is.
- **Claude:** whenever a change lands on one side only — a web feature the app does not
  have, a server route the app cannot call, a shared file duplicated rather than imported —
  **add an entry here in the same turn as the change**, before committing. Say so in the
  summary. If a change closes a gap, move that entry to *Recently closed* with the date.
  When a fix must be deliberately weakened so the app keeps working (an app-compat shim in
  a server route), that shim is itself an entry: it says what to delete once the app catches up.

Entry format: what the website does · what the app does · what the customer hits · the fix.
Order the open list by how badly it bites, worst first.

---

## Open

### 1. Categories are hard-coded in the app
- **Web:** `/order` builds its category rows from the Firestore `service_categories`
  collection — admin controls the name, icon, blurb, sort order and the `hidden` flag.
- **App:** `screens/HomeScreen.tsx` has a literal `CATEGORIES` array of four categories with
  hard-coded labels, icons and blurbs.
- **Customer hits:** a category the admin hid is still offered in the app, and
  `create-cart-payment` then refuses the basket ("… är inte längre tillgänglig") at the
  payment step. New categories never show up at all.
- **Fix:** fetch the categories (they are already public via `/api/services` +
  `service_categories`) and render the rows from that, mirroring `lib/serviceCategories.ts`.

### 2. Mattvätt is priced per m² on the web, fixed sizes in the app
- **Web:** rug type + a size slider, priced kr/m² from `settings/mattvatt`; the cart line is
  `matta-normal-3.5`.
- **App:** three fixed sizes (`matta-liten` 299 / `matta-stor` 499 / `matta-akta` 699) in
  `HomeScreen.tsx`.
- **Customer hits:** app prices ignore what the admin sets. The prices only still work
  because `app/api/create-cart-payment/route.ts` keeps a `MATTVATT_PRICES` compatibility map
  purely for the app.
- **Fix:** port the m² slider (`components/SquareMeterSlider.tsx` already exists in the app),
  then **delete `MATTVATT_PRICES` from the server route** — that map is app-compat debt.

### 3. Per-kg / per-m² products cannot be ordered from the app
- **Web:** measured products carry `pricing` (unit, step, min/max) and each cart line sends
  an `amount`; price = rate × amount, re-derived server-side (`lib/serviceUnits.ts`).
- **App:** adds every product at its flat `price` with no `amount`.
- **Customer hits:** `create-cart-payment` rejects a measured line with no `amount`, so any
  per-kg or per-m² product fails at payment.
- **Fix:** port the amount picker and send `amount` on those lines.

### 4. Minsta antal per vara is not enforced in the app
- **Web:** a catalogue item can carry a `minQty` — the fewest of it the shop takes at
  once, set per item under Tjänster. `/order` shows a "Minst 5 st" badge, the first "+"
  adds the whole minimum, and "−" takes the line out rather than leaving it short, so a
  basket below the minimum cannot be built.
- **App:** `HomeScreen.tsx` adds every product one at a time and knows nothing about
  `minQty`.
- **Customer hits:** adds one of an item the shop only takes five of, fills in the whole
  form, and `create-cart-payment` refuses the basket at the payment step
  ("Minsta antal är inte uppfyllt för …"). The item is orderable again as soon as they
  guess the right number, with nothing on screen saying what it is.
- **Fix:** read `minQty` from `/api/struken-tvatt` (it is already normalized there), show
  it on the product row, and mirror the two cart rules from `lib/minOrderQty.ts` —
  `addStep` on "+" and `qtyAfterRemove` on "−".

### 5. Admin-blocked dates are not greyed out in the app
- **Web:** `components/DatePicker.tsx` fetches `/api/availability` and disables blocked days.
- **App:** `components/DatePickerModal.tsx` offers every date.
- **Customer hits:** picks a blocked day, fills in the whole form, gets rejected at payment.
- **Fix:** same fetch in `DatePickerModal` (the endpoint is public and needs no auth).

### 6. No 0 kr test-order path in the app
- **Web:** an all-0 kr basket skips Stripe entirely and the order is written already paid.
- **App:** `CartPaymentScreen` waits for a `clientSecret` and keeps the pay button disabled
  when the server returns `null` for one.
- **Customer hits:** only the admin, doing a test order from the app — it dead-ends.
- **Fix:** when the response has no `clientSecret` but has an `orderId`, jump straight to the
  confirmation screen.

### 7. Shared logic is duplicated, not imported
`skraddare-app/lib/discount.ts`, `lib/rut.ts` and `lib/timeslots.ts` are hand-copied mirrors
of the website files of the same name (RN cannot import across the Next app). **Any change to
a web copy must be mirrored into the app copy in the same commit** or the app's price preview
drifts from what the server charges. Same story for `lib/productIcons.ts`.

### 8. Dead legacy screens still in the tree
`BookScreen.tsx`, `PaymentScreen.tsx`, `ProductsScreen.tsx` and `StrukenTvattScreen.tsx` are
not registered in `navigation/RootNavigator.tsx` — leftovers from the single-service flow that
posted an exact time ("14:00") to `/api/create-payment`. The website dropped that flow.
- **Fix:** delete them (and `lib/api.ts`), then decide whether `/api/create-payment` still has
  any caller. Until then, do not "fix" those screens — they are not shipping.

### 9. No privacy-policy link in the app
- **Web:** `/integritetspolicy`, driven by the GDPR settings the admin edits.
- **App:** `ProfileScreen` links to nothing.
- **Customer hits:** nothing — but App Store review requires the link.
- **Fix:** link out to the hosted policy from Profil.

### 10. First-time discount is derived differently
- **Web:** `/api/first-time-eligibility` (verifies the ID token server-side).
- **App:** reads `customers/{uid}.hasPlacedOrder` straight from Firestore.
- **Customer hits:** nothing today — the server decides the real discount either way, this is
  display only. Worth aligning when the app is touched anyway.

---

## Recently closed

- **2026-08-30 — Bookable time windows.** The admin can now edit the pickup and delivery
  windows (Inställningar → Tider, `settings/timeslots`). The app was updated in the same
  change: `skraddare-app/lib/timeslots.ts` + `TimeSpanPickerModal` now read the admin's list
  from `/api/timeslots` instead of the hard-coded `08-12 / 12-16 / 16-20`, which is what let
  `create-cart-payment` start rejecting a time the admin no longer offers.
