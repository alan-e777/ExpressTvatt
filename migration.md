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

### 1. Shared logic is duplicated — now enforced, not trusted
`skraddare-app/lib/{mattvatt,serviceUnits,serviceCategories,minOrderQty,rut,discount,timeslots}.ts`
are copies of the website files of the same name, because React Native cannot
import across the Next app. They are now kept **byte-identical** rather than
"kept in sync by hand", and `npm run check:mirrors` fails when one drifts.
- **Why it matters:** these modules decide prices. A silent divergence quotes the
  customer one total and charges another, which is the one class of bug nobody
  notices until it reaches a bank statement.
- **The one permitted difference** is `API_URL`: the app copies prefix an origin
  onto their fetch paths, because RN has none to resolve a relative path
  against. The check strips those lines and compares everything else.
- **Still to do:** run `npm run check:mirrors` after touching any of them, and
  copy the web file over the app one rather than editing a single side.
  `lib/productIcons` remains a genuine fork — the web returns JSX, the app
  returns React Native components — so it is not in the check.

### 2. Ads tracking (Google tag / gtag.js) is web only
- **Web:** `components/TrackingPixel.tsx` loads the ads team's Google tag (`AW-18517355089`) on every
  public page from `app/layout.tsx`, and re-runs `gtag('config', …, { page_path })` on client-side route
  changes. Admin and driver are excluded. Consent is handled with Consent Mode v2: `lib/consent.ts` +
  `components/CookieBanner.tsx`, with withdrawal (`components/ConsentReset.tsx`) in the privacy policy's
  cookie section. The tag loads for everyone but stores nothing until the visitor accepts (2026-10-22).
- **App:** nothing — gtag.js is browser JavaScript. Google Ads' mobile equivalent is the Firebase SDK
  (`@react-native-firebase/analytics` + the Ads/Firebase link), which is not in the app's tree.
- **Customer hits:** none; this only affects the ads team's attribution.
- **Deliberately deferred (2026-10-26).** It needs the ads team to say whether app installs and in-app
  bookings need attribution at all, and it adds a native SDK plus a consent UI. **Action for the owner:
  ask them before launch.**
- **Note for the app:** the consent requirement travels with the tracking, not with the browser. If the
  app ever gets the Firebase/Ads SDK it needs its own consent gate — an ATT-style prompt or an
  equivalent of this banner — and `lib/consent.ts` is web-only (`localStorage`), so it would need a
  React Native counterpart backed by `AsyncStorage` rather than an import.

### 3. Marketing surface added to the landing page is web only (2026-10-28)
- **Web:** the landing page now carries the ads team's copy, links to the three social channels
  (`components/SocialLinks.tsx` — one list, rendered in the hero and the footer) and a Google
  reviews strip (`components/GoogleReviews.tsx` + `GET /api/reviews` + `lib/googleReviews.ts`).
  The homepage's SEO tags moved into a server wrapper, `app/page.tsx`, so the canonical points at
  `/` and is not inherited by every route.
- **App:** none of it. The app has no landing page, no footer and no About surface, so there is
  nowhere for any of this to live yet.
- **Customer hits:** nothing functional. A customer who only ever uses the app sees no social
  links and no reviews — a marketing gap, not a behavioural one.
- **Fix, if wanted:** a small "Om oss" block on the app's Profile tab could reuse the same three
  URLs and call `GET /api/reviews` as-is; the route is public and returns plain JSON. Low value
  until the app is actually on the Store.
- **Company name:** `lib/gdpr.ts` now defaults to **Expresstvätt STHLM AB**. The app never renders
  a company name, so there is nothing to mirror — but see the warning in that file: the stored
  Firestore value, if one exists, wins over the default.

### 4. Account deletion has no web UI — and that is a deliberate choice
- **Web:** `/profil` has no "Radera konto" control. `POST /api/account/delete` is live but only the app
  calls it.
- **App:** `ProfileScreen` calls it behind a two-step confirmation, because App Store guideline
  5.1.1(v) rejects any app that can create an account but not delete one.
- **GDPR position (checked 2026-10-26):** Article 17 obliges the controller to *honour* an erasure
  request; it does not mandate a self-service button. The privacy policy states the right to
  `radering` and gives a contact address, in both Swedish and English
  (`app/integritetspolicy/page.tsx`), so a web customer's request has a working channel. **No rule is
  being broken.** Apple's requirement is app-only, and that is satisfied.
- **Worth doing anyway** when `/profil` is next touched: the route needs nothing, only the UI. A
  self-service control is less work than handling requests by hand.

### 5. Guest checkout, and its consent box, are web only (2026-10-30)
- **Web:** `/kassa` takes an order without an account. The buyer's name, phone, address and
  postcode live on the order itself, and a marketing-consent tick sits at the bottom of the
  form — unticked, same wording as signup, written onto the order by `create-cart-payment`
  because there is no `customers/{uid}` document to hold it.
- **App:** there is no guest checkout at all. `RootNavigator` renders `AuthScreen` whenever
  nobody is signed in, so every app order already has an account behind it and the consent
  question is answered at signup instead.
- **Customer hits:** nothing. This is not a missing feature so much as a different front door.
- **If the app ever drops the login wall**, it must add the same tick to its checkout and send
  `newsletter` in the `create-cart-payment` body. Match the web default — **pre-ticked at
  checkout, unticked at signup** — and keep it plainly visible, since a pre-tick the customer
  never saw is not an opportunity to decline. An app guest order without the field would land
  in the client's export as N forever, with no way to ask.
- **Also web only:** the guest opt-out path — `marketing_optouts`, and the `?e=`/`?t=` form of
  the unsubscribe link. Nothing in the app reads or writes either.

---

## Recently closed

- **2026-10-26 — The app now reads the same catalogue as the website.** Thirteen entries closed in
  one pass, all app-side unless noted:
  - **Categories are no longer hard-coded.** `HomeScreen` had a literal four-category array; it now
    builds its rows from the catalogue plus `/api/service-categories`, resolved through the shared
    `resolveCategoryMeta`/`compareCategories`. A category the admin adds, renames, reorders or hides
    reaches the app, and the icon comes from the admin's `icon` key.
  - **Mattvätt is priced per m².** The three fixed sizes (299/499/699) are gone; the app now shows the
    rug types and size slider from `settings/mattvatt` and sends area-based lines. **The server's
    `MATTVATT_PRICES` shim was deleted with it** — together with the name-regex fallback beside it,
    because removing only the table would have dropped a stale `matta-liten` into a regex that reads
    "2 m²" out of its own name and charges 180 kr for a 299 kr rug. Legacy rug lines now price to null
    and are dropped rather than guessed at. **An app build older than this will not price rugs.**
  - **Per-kg / per-m² products can be ordered.** Measured products open a sheet that asks for the
    amount, snapped to the unit's step and clamped to the admin's range, and the line carries `amount`
    so `create-cart-payment` stops refusing it.
  - **Categories that ask for a note now ask.** `requiresInput` is honoured in the same sheet, so a
    tailoring category is actionable instead of arriving with no instruction.
  - **Address confirmation works again.** `fetchPlaceDetails` called Google's legacy Places endpoint
    directly — switched off for this Cloud project — and returned empty strings silently, while the
    component fell back to the prediction text and confirmed anyway. **Orders were being written with
    no postcode.** It now calls `/api/places/details`, which also retires
    `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`: the app needs no Google key at all.
  - **The drawn service area is enforced.** The app honours `outsideArea` and leaves the field
    unconfirmed, so an address in the notch of a concave area is no longer accepted. A failed lookup
    now says so instead of confirming.
  - **RUT is per item.** `computeCartTotals` returns `rutEligibleTotalKr` and both `HomeScreen` and
    `CheckoutScreen` take the deduction from that share only, so a basket holding something the admin
    marked as not RUT-eligible is no longer quoted a bigger deduction than it is charged.
  - **Minsta antal is enforced.** The tile shows "Minst N st", the first "+" adds the whole minimum and
    "−" drops the line rather than leaving it short, via the shared `addStep`/`qtyAfterRemove`.
  - **Admin-blocked dates are greyed out.** `DatePickerModal` fetches `/api/availability`, cached once
    per session; a failed load blocks nothing and lets the server decide.
  - **0 kr test orders work from the app.** A response with no `clientSecret` but an `orderId` goes
    straight to the confirmation screen instead of dead-ending on a disabled pay button.
  - **0 kr items are admin-gated.** The app calls `/api/test-mode` and filters 0 kr tiles out for
    everyone else, so a customer is never offered a free tile they would be refused at checkout.
  - **First-time eligibility comes from the server.** `/api/first-time-eligibility` with a verified ID
    token, rather than reading `customers/{uid}.hasPlacedOrder` from the client.
  - **Dead legacy screens deleted.** `BookScreen`, `PaymentScreen`, `ProductsScreen` and
    `StrukenTvattScreen` were unregistered leftovers of the single-service flow, along with
    `createPaymentIntent` in `lib/api.ts`. `/api/create-payment` is left alone — it is on CLAUDE.md's
    do-not-touch list.
  - **The privacy policy is linked** from Profil (App Store requirement).

  The cart was reworked to make this possible: lines are now keyed by `cartLineKey(id, note, amount)`
  rather than by product id, so two amounts or two notes of the same product are two lines, exactly as
  on the website.

- **2026-08-30 — Bookable time windows.** The admin can now edit the pickup and delivery
  windows (Inställningar → Tider, `settings/timeslots`). The app was updated in the same
  change: `skraddare-app/lib/timeslots.ts` + `TimeSpanPickerModal` now read the admin's list
  from `/api/timeslots` instead of the hard-coded `08-12 / 12-16 / 16-20`, which is what let
  `create-cart-payment` start rejecting a time the admin no longer offers.
