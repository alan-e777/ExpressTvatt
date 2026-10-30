## Deployment — start at devNotes/LAUNCH_CHECKLIST.md
**`devNotes/LAUNCH_CHECKLIST.md` is the single ordered list of what is left before launch**, across the website, the iOS app and security. Read it first in any new session, and keep it current: tick items off as they land, and add anything new that blocks launch. Everything else is detail hanging off it.
- `devNotes/BEFORE_DEPLOYMENT.md` — website security and data issues, with exact code fixes per item.
- `devNotes/GO_LIVE_HANDOVER.md` — the cutover-day runbook (Stripe live keys, webhook, Maps).
- `devNotes/IOS_APP_STORE.md` — the iOS app's state and its Apple runbook (see its own section below).
- `devNotes/FIREBASE_EMAIL_TEMPLATES.md` — the password-reset email, and why Firebase blocks editing it.

Three things a new session gets wrong if it does not read the checklist first: the app's source is **not in git** (it lives in the working tree plus the local-only branch `local-only/app-work`, which must never be pushed); this repository is **public**, so nothing secret may ever be committed; and app changes normally ship by **OTA update**, not a rebuild.

## Never commit the owner's personal files
Files the owner writes **for themselves** — notes, scratch prompts, working instructions, todo lists, personal reference — are not part of the codebase and must **never** be committed or pushed. If the owner creates `instructions.md`, `notes.md`, `todo.md`, `ideas.md`, a stray `.txt` dump or anything similar, leave it alone: do not `git add` it, do not include it in a commit, do not mention it in a commit message.

This is a carve-out from "always commit + push in the same turn". That rule covers **actual changes** — code, config, and the project docs that are checked in on purpose (`CLAUDE.md`, `migration.md`, `structure.md`, `style.md`, `workflow.md`, `devNotes/`). It does not cover the owner's own working files.

- Prefer `git add <specific paths>` over `git add -A` / `git add .`, so an untracked personal file cannot be swept in.
- Before committing, read `git status` and stage deliberately. If an unfamiliar file appears that you did not create, treat it as the owner's and leave it untracked.
- If a personal file genuinely should be ignored for good, add its name to the "Claude scratch files" block in `.gitignore` — but ask first, and never `git rm` a file the owner created.
- If one is already tracked, say so and let the owner decide; do not remove it from git on your own.

## Default target
Unless the user says "mobile", "app", "iOS", or "Expo", always assume changes are for the **website** (`app/` — Next.js). Never touch `skraddare-app/` unless explicitly asked. The app is not live yet, which is why web-only changes are fine — but they leave debt, see below.

## devNotes/IOS_APP_STORE.md — the iOS app's state and launch runbook
**Read it before touching `skraddare-app/`, and before answering any question about the app's readiness, signing, builds, OTA updates or the App Store.** It is the single record of:
- **what is proven and what is not.** The app is built, signed and running on the developer's iPhone, but a long list of features typecheck and bundle without ever having been seen working on a device — that list is at the top, under "Where the app stands". Do not describe any of it as working.
- **the launch runbook** (section B): the exact ordered steps once the client's Apple Developer account exists — releasing the bundle id from the developer's personal team, switching Stripe to the client's live key, re-signing, APNs, the Places key, submission.
- **the blockers needing the Apple account or owner input** (A–I), including the one easiest to get wrong: production runs **live** Stripe keys from the client's account while the app carries a **test** key from a different one. Never put a live key into a preview or simulator build.
- EAS coordinates: project `@calleexpressapp/express-tvatt`, bundle id `se.expresstvatt.app`, profiles `simulator` / `preview` / `production`, OTA channel `preview`.

**Keep it current in the same turn as any app change**, the way `migration.md` is kept: move items out of "never seen running" once confirmed on a device, and add new rough edges as they appear. A fix nobody wrote down is a fix nobody remembers to verify.

**All `skraddare-app/` work is deliberately uncommitted** (the owner keeps only the website in git), so this file is also the only durable record that the work exists.

## npm run check:mirrors — the duplicated pricing modules
Seven modules exist twice because React Native cannot import across the Next app: `mattvatt`, `serviceUnits`, `serviceCategories`, `minOrderQty`, `rut`, `discount`, `timeslots`. They are kept **byte-identical** between `lib/` and `skraddare-app/lib/`, and `npm run check:mirrors` fails when one drifts (lines naming `API_URL` are exempt — RN has no origin for a relative fetch path).
`newsletter.ts` is the eighth, added 2026-10-28: it holds the marketing-consent
wording and the "absent means no" rule, and the two surfaces must never show a
customer different consent text or read the flag differently.
**Never edit one side only.** Copy the web file over the app one, then check the app still compiles. These modules decide prices: a silent divergence quotes the customer one total and charges another.

## migration.md — the web ↔ app ledger
`migration.md` records every place the website and the iOS app now behave differently, so the owner can work through it before the app launches.
**Whenever a change lands on one side only, add an entry to `migration.md` in the same turn — before committing — and mention it in the summary.** That includes: a web feature the app does not have, a server route the app cannot call, a shared file duplicated instead of imported, and any app-compat shim left in a server route (the entry then says what to delete once the app catches up). When a change closes a gap, move that entry to *Recently closed* with the date.

## Stack
- `skraddare-app/` — Expo customer app (React Native)
- `app/` — Next.js App Router (API routes + admin dashboard)
- Firebase: Firestore (DB), Auth (admin only), firebase-admin (server-side)
- Stripe: payments in customer app

## UI
Read `style.md` before creating or editing any screen or component.

## Do not touch
- `lib/firebase.ts`, `lib/api.ts`, `lib/stripe.ts`
- `App.tsx` (StripeProvider/GestureHandler wrapper)
- Stripe payment logic in PaymentScreen — restyle only
- Firestore queries and onSnapshot listeners — keep in place
- `app/api/create-payment/`, `app/api/services/`, `app/api/webhook/` — existing API routes

## Custom components (web)
- `components/DatePicker.tsx` + `components/TimePicker.tsx` — custom dropdowns, must stay visually in sync. Never replace with native `<input type="date/time">`.
- `TimePicker` no longer hard-codes the windows: it takes `kind="pickup" | "delivery"` and fetches the admin-configured list from `/api/timeslots` (module-level cache shared with the cart, same trick `DatePicker` uses for blocked dates). `minEndHour` greys out windows that have already closed today.
- Kassa (`app/kassa/page.tsx`) fetches `customers/{uid}` on auth to show a profile card and pre-fill contact fields. `notes` textarea is the single source of truth — no separate careOf field.

## Newsletter consent & the customer CSV export
Admin → Orders has a second export button, **"Alla kunder (CSV)"**, next to the
monthly XLSX one: the client's own mailing list, one row per customer.
- `GET /api/admin/customers/export` (admin-gated, `force-dynamic`) reads
  Firestore; **all the shaping is in `lib/customer-export.ts`**, which is pure so
  the rules can be tested without an admin session.
- **One row per customer, never per order** — the file feeds a mail merge.
  Guests (orders with `customerId: 'anonymous'`) get a row too, keyed by email,
  de-duplicated against account holders and marked `Typ: Gäst`.
  `pending_payment` orders are skipped.
- CSV is **semicolon-separated with a UTF-8 BOM and CRLF** — anything else and
  Swedish Excel mangles åäö or puts every row in one column.
- The **`Vill ha reklam` J/N column** is the point: the file holds everyone and
  the client filters it themselves.
- `lib/newsletter.ts` (mirrored to the app) is the single source of truth for
  the flag. **Absent means no** — accounts predating the field read N, which is
  correct, since consent that was never asked for cannot be inferred.
- **One tick, two channels (2026-10-28).** The consent covers **e-post and
  SMS**; live phone calls are deliberately out, since those sit under
  NIX-Telefon rather than marknadsföringslagen § 19. `newsletterChannels`
  records what each consent actually covered, and **absent means `['email']`** —
  the wording was e-post-only until 2026-10-28, so anyone who ticked before
  that must never be texted. The export's **`Kanaler`** column shows which, so
  the client can see a J that is e-post only.
  To add a channel later: extend `NewsletterChannel`, add it to
  `CURRENT_CHANNELS` and update `NEWSLETTER_LABEL`. Do **not** retro-apply it to
  existing consents.
  The signup box is **never pre-ticked** and the label must stay legible; that
  file records why both are legal requirements, not preferences.
- **Guests get the same tick at checkout (2026-10-30).** `/kassa` shows it only
  when nobody is signed in: a signed-in buyer answered at signup and can change
  it under Profil → Utskick, and letting a checkout rewrite that would mean the
  last order silently overruled their profile. The guest's answer is written
  **onto the order** by `create-cart-payment` (`consentFields(..., 'guest')`),
  since a guest has no `customers/{uid}` document. The export reads the
  **most recent** order: a later untick overrides an earlier tick, which is the
  safe direction.
- **The checkout box is pre-ticked; the signup boxes are not** (owner's
  decision, 2026-10-30). That makes it an opt-*out*, which does not rest on
  art. 4(11) consent but on the existing-customer route in
  marknadsföringslagen § 19 st. 2 — lawful only while the customer gets a clear
  chance to decline when the address is collected **and in every message
  since**. So: the box must stay plainly visible in the checkout (never
  collapsed, hidden or pushed below the fold), and the client's sends must
  always carry the unsubscribe link. `Typ: Gäst` in the export is what keeps an
  untouched pre-tick distinguishable from an actively ticked signup — do not
  let the two columns blur into one.
- **A guest's opt-out is its own record.** There is no document to flip, so
  `POST /api/unsubscribe` with `{email, token}` writes
  `marketing_optouts/{guestOptOutKey(email)}` — a hash of the lowercased
  address, not the address itself. The export loads that collection and marks
  those guests N, overriding whatever their last order said. Guest links are
  signed with a **different HMAC subject** from account links
  (`unsubscribe-guest:` vs `unsubscribe:`), so neither family can authorise the
  other's write.
- **Customers withdraw it themselves** under Profil → **Utskick**, a switch on
  both surfaces that writes `consentChangeFields(...)` straight through — no
  confirmation step, because withdrawal has to be as easy as consent was
  (art. 7(3)). Turning it off stamps `newsletterConsentWithdrawnAt`, and the
  next export shows that customer as N on its own.
- **The export carries a one-click `Avregistreringslänk` per customer**, which
  is what goes in the mailing tool's merge field. **The link always points at
  the live domain** (`lib/site-url.ts`), never at the host the admin downloaded
  the file from — an export taken from localhost or a preview would otherwise
  ship a campaign whose every unsubscribe link fails. It needs no login:
  `lib/unsubscribe.ts` signs the uid with `UNSUBSCRIBE_SECRET` (HMAC-SHA256,
  24 hex chars), `/avregistrera` POSTs it to `POST /api/unsubscribe`, and that
  writes `newsletterConsent: false`. Requiring a login instead would make
  withdrawal harder than consent was, which art. 7(3) forbids.
  - **The mutation is POST, never GET.** Mail scanners and security gateways
    fetch every link in a message; a GET would let a customer's own spam filter
    unsubscribe them. The page fires the POST from JavaScript on load, so it is
    still one click for the customer.
  - **No secret configured → the column is empty and the route 503s.** Never a
    link that silently fails: a customer told they opted out when nothing was
    written is worse than no link.
  - Links have **no expiry** (people act on old emails) and are **blank for
    guests**, who have no account to flip and always read N.
- Nothing here *sends* marketing email — the client's own tool does that.
- **Guest checkout is web only** — the app requires a login, so it has no guest
  consent box and never writes one. See `migration.md` #5.

## create-cart-payment validates the contact details (2026-10-30)
`name`, `email`, `phone` and `address` are re-checked server-side and answer
400 when blank. Both clients already block an empty field, so this only catches
a request that did not come from one of them — but it matters because a guest
order is the **only** record of that customer. There is no profile for
`resolveCustomerContact` to fall back on, so an order that arrives without an
email or an address can be neither confirmed nor delivered. `postalCode` is
deliberately **not** required: some Places results have none, and blocking a
checkout over it would be worse than storing a blank.

## Minimum order quantity (per item)
A catalogue item can require a minimum number per booking — set per item under Tjänster, on the `min 1` chip in the product row (or the "Minsta antal" field in the add / new-category forms). Stored as `minQty` on the StrukenTvatt doc; 1 means no minimum, which is also what every pre-existing doc normalizes to.
- `lib/minOrderQty.ts` is the single source of truth: `normalizeMinQty`, `minQtyLabel`, and the two cart rules `addStep` (first "+" adds the whole minimum) and `qtyAfterRemove` ("−" drops the line rather than leaving it short).
- `/order` therefore cannot build a basket under a minimum, and shows a "Minst N st" badge on the tile. `create-cart-payment` re-checks every struken line against the catalogue anyway and refuses the basket if one is short.
- The minimum counts *lines*, not units of a measured product — a per-kg item's own floor is `minUnits` (`lib/serviceUnits.ts`) and this sits on top of it.
- The iOS app does not know about `minQty` yet — see `migration.md` #7.

## RUT-avdrag eligibility (per item & per category)
Not everything a laundry sells qualifies for the household-service deduction, so RUT is set **per catalogue item**, with a category-level toggle that applies to all of them at once. Both live under Tjänster: a `RUT` / `ej RUT` chip on each product row (next to the `min N st` chip) and a `RUT` button in the category header (next to the eye).
- `lib/rut.ts` is the single source of truth: `RUT_DISCOUNT_PERCENT`, `rutRefundKr`, `rutNetKr`, plus `RUT_ELIGIBLE_DEFAULT` and `normalizeRutEligible`. **Absent means eligible** — everything predates the flag, so a missing value has to keep meaning "RUT applies" or the deduction would silently vanish from every existing product.
- Stored as `rutEligible` on the StrukenTvatt doc, and on the `service_categories` doc.
- **The category toggle is a bulk write, not an inheritance.** `POST /api/admin/service-categories/rut` sets the category flag *and* batch-writes `rutEligible` over every product in it. Only the product's own flag is ever read when pricing — that is what lets a single item be flipped back afterwards without the category overruling it. A category whose items disagree shows as **`RUT delvis`**; clicking it then turns them all on. (Contrast `requiresInput`/`inputDisabled`, which *is* a real inherit-and-override pair.)
- **Mattvätt is the exception**: priced from `settings/mattvatt` with no catalogue products, so its category flag is the whole truth. Its header toggle writes via the ordinary `PUT /api/admin/service-categories` and it can never read "delvis".
- A **new product inherits its category's current flag** (`handleAdd` in `StrukenTvattEditor`) — otherwise adding a garment to a RUT-off category would quietly put RUT back on it.
- Pricing: `computeCartTotals` (`lib/discount.ts`) returns **`rutEligibleTotalKr`** next to `totalKr`, accumulated from the *discounted* line totals, and RUT is `rutRefundKr(rutEligibleTotalKr)`. Item and first-time discounts land before RUT; the delivery fee is never in it. Mirrored in `/order`, `/kassa` and re-derived from the catalogue in `create-cart-payment`, which is what actually decides the charge.
- **Ticking RUT never gets undone by the basket.** A cart holding only ineligible items keeps the box ticked and simply deducts nothing, so the deduction reappears by itself once a qualifying item is added — the customer may well go back for one. `/order` shows it by leaving those tiles at full price; `/kassa` says so in a line under the checkbox.
- The iOS app still applies RUT to the whole basket — see `migration.md` #6.

## Booking time windows
Admin-editable under Inställningar → "Tider för upphämtning & avlämning" (`app/admin/(dashboard)/settings/TimeSlotsPanel.tsx`). Pickup and delivery keep **separate** lists; each card has a mirror button that copies its list over the other one.
- `lib/timeslots.ts` is the single source of truth — types, defaults (`08-12`/`12-16`/`16-20`), `"HH-HH"` ⇄ `{start,end}` conversion, the strict `validateSlots()` used on save and the lenient `normalizeSlots()` used on read.
- Firestore `settings/timeslots` → `{ pickup: [{start,end}], delivery: [{start,end}] }`, whole hours 0–24.
- Orders still store the span string (`"08-12"`), so orders/driver/calendar were untouched.
- Rules: gaps are fine (08–12 + 14–16 leaves 12–14 unbookable), overlaps are rejected, an empty list is rejected (it would make booking impossible), max 12 windows. Enforced in the panel *and* re-checked in `POST /api/admin/timeslots`; a corrupt doc falls back to the defaults on read so checkout can never end up with nothing to book.
- Routes: `GET/POST /api/admin/timeslots` (admin) · `GET /api/timeslots` (public, for the pickers — `settings` is not client-readable per `firestore.rules`).
- The iOS app reads the same list: `skraddare-app/lib/timeslots.ts` (hand-copied mirror — keep the two in sync) feeds `TimeSpanPickerModal`/`CheckoutScreen`. Because both clients agree, `create-cart-payment` rejects a pickup or delivery time that is not on the admin's list; an empty time or a failed settings read skips the check rather than blocking checkout.

## Booking availability — closed days & recurring weekday closures
Admin-editable on the **Calendar** page. Two ways to close a day, and the
difference matters: `lib/availability.ts` is the single source of truth for
both, and is client-safe (no `firebase-admin`).
- Firestore `settings/availability` → `{ blockedDates, blockedWeekdays, allowedDates }`.
  `blockedWeekdays` is `0`–`6` matching `Date.getDay()` (0 = Sunday).
- **A weekday closure is a standing rule, not a bulk edit.** Switching Saturdays
  off writes `blockedWeekdays: [6]` and nothing else — no dates are expanded
  into `blockedDates`. So it covers every future Saturday with no end date, and
  switching it back on reopens them all. Resolution order in `isDateBlocked`:
  an explicit `blockedDates` entry wins, then an `allowedDates` exception,
  then the weekday rule.
- **`allowedDates` is what makes the rule usable**: "generally no Saturdays, but
  I can do the 15th". Clicking a rule-closed day in the calendar records the
  exception rather than fighting the rule; clicking it again removes it. The
  day-detail panel says which of the two is in play.
- Exceptions are **not** deleted when a weekday is reopened. They are inert
  while the rule is off (`isDateBlocked` only consults them against a live
  rule) and come back correctly if it is closed again — deleting them would
  silently throw away the admin's own decisions.
- `POST /api/admin/availability` (single day) is **rule-aware** and
  read-modify-write, not `arrayUnion`: closing a day the rule already closes
  must not also write an explicit block, or that day would stay shut after the
  rule was lifted. `PUT` sets the weekday rules.
- **`GET /api/availability` flattens the rules into plain dates**
  (`expandBlockedDates`, 400-day horizon, explicit blocks always included even
  beyond it). That is what let this ship without touching the website picker or
  the iOS app — both still read `blockedDates` and both got the feature for
  free, with no way to disagree about what a rule means.
- `create-cart-payment` re-checks with the same `isDateBlocked`, so a weekday
  closure is enforced at the charge and not only in the UI.
- Dates are parsed with `weekdayOf`/`toYmd`, which build from the parts rather
  than `new Date(ymd)` / `toISOString()` — a bare date string parses as **UTC**,
  which would shift the weekday and make "no Saturdays" close Fridays.

## Service area (delivery zone)
Admin-editable under Inställningar → "Tjänsteområde" (`app/admin/(dashboard)/settings/SettingsClient.tsx`). It used to be a circle; it is now a **polygon with any number of points (3–60)**, drawn on the map.
- `lib/serviceArea.ts` is the single source of truth: types, `pointInPolygon`, `boundingCircle`, `boundingRect`, `polygonFromCircle`, `areaSqKm`, the strict `validatePolygon()` used on save and the lenient `normalizeServiceArea()` used on read. Client-safe — no `firebase-admin`. `lib/serviceArea-server.ts` holds the one Firestore read (`getServiceArea()`).
- Firestore `settings/driver` → `serviceArea: { polygon: [{lat,lng}], lat, lng, radiusKm }`. **`lat`/`lng`/`radiusKm` are the polygon's bounding circle**, recomputed server-side on every save — never edited on their own, kept only for consumers that cannot express a polygon. A document written before polygons existed reads back as an editable octagon around its old circle, so nothing had to be migrated.
- **Google cannot take a polygon.** `locationRestriction` accepts a circle or a rectangle and nothing else. So the enforcement is two-stage: `/api/places/autocomplete` restricts suggestions to the polygon's **bounding box**, and `/api/places/details` applies the **exact** shape once the chosen place has coordinates — answering `{ outsideArea: true }`, deliberately with status 200, because the client falls back to the prediction's own text on an error status and would otherwise accept the address being rejected. `components/AddressAutocomplete.tsx` shows the message and leaves the field unconfirmed.
- Editing is behind an explicit **"Redigera område"** button, so a stray map click cannot redraw the delivery zone. While it is on: click the map to append a point (they connect in placement order), drag a numbered marker to move one, right-click it or use the × in the point list to remove it. Buttons: Ångra sista · Rensa alla · Återställ till cirkel · Visa hela.
- **There is no separate "done" or bottom save button.** A floating save bar (fixed, bottom-left) appears as soon as anything on the page differs from what is stored, and its **Spara** is the only way to finish drawing — saving is what leaves edit mode. The two used to be separate controls that looked equally final, and a tester finished with the wrong one and lost the shape. Do not reintroduce a second place to save.
- The bar is driven by `savedSettings` / `savedDiscounts` — snapshots of what the **fetch returned**, never the page's built-in defaults. They stay `null` until a load succeeds, nothing counts as changed while they are null, and `save()` refuses outright. That is what stops a failed load from offering to write a default 5 km circle over a real configured area. Keep that guard.
- Rules: 3–60 points; **self-intersecting shapes are rejected** (a bow-tie's overlap reads as *outside*, which is never what dragging a corner past another one meant). Enforced in the panel *and* re-checked in `POST /api/admin/settings`; a corrupt document falls back to the default 5 km octagon on read, so the address field can never go dead because of bad settings.
- The Settings page's own start/stop address inputs pass the **unsaved** polygon to `/api/admin/driver/autocomplete` as a `polygon` query param, so suggestions follow the shape being drawn.
- The iOS app is held to the bounding box only — see `migration.md` #5.

## Admin dashboard (`app/admin/`)
Protected by `middleware.ts` + cookie-based session (`admin-session`).
Multi-admin: admins live in the Firestore `admins/{uid}` collection (managed server-side via Admin SDK). `ADMIN_UID` is the bootstrap/root admin so the owner can never be locked out. `lib/admin-auth.ts` (`isAdminUid`/`getAdminSession`/`getAdminRole`/`mustChangePassword`) is the single source of truth for admin checks.

Roles (`lib/admin-roles.ts`): `developer` | `huvudadmin` | `admin`. `developer` is not assignable — it is applied in code to `ADMIN_UID`, which also displays as `ROOT_DISPLAY_NAME` ("Carl") instead of its email. It carries identical authority to `huvudadmin`. `canManageAdmins()` gates adding, removing, password resets and role changes to those two roles; a plain `admin` gets the list read-only. Nobody may change or remove **their own** role/access (`uid === session.uid` is rejected), which is what makes self-lockout impossible. `POST /api/admin/admins/role` changes a role.
Auth flow: Firebase client auth → POST `/api/admin/session` (accepts the bootstrap UID **or** any `admins/{uid}` entry) → sets httpOnly cookie.
Add-admin flow: Settings → "Administratörer" → `POST /api/admin/admins`. If the email already has a Firebase Auth account (usually a customer login) it is **promoted** — an `admins` doc is created with `mustChangePassword:false` and they keep their existing password. Otherwise a new Auth user is created with a one-shot temp password from `lib/temp-password.ts` (8 chars — Firebase rejects anything under 6, which is why the old 4-digit codes always failed) + an `admins` doc with `mustChangePassword:true`. `POST /api/admin/admins/reset-password` reissues a temp password when the original is lost; the bootstrap `ADMIN_UID` is excluded. The dashboard layout gate (`(dashboard)/layout.tsx`) redirects such admins to `/admin/change-password` (non-skippable) until they set a real password via `POST /api/admin/change-password`.
See `structure.md` for full file map.

## Env vars
- `ADMIN_UID` — Firebase UID of the bootstrap/root admin (in `.env.local`)
- `UNSUBSCRIBE_SECRET` — any long random string; signs the one-click
  unsubscribe links in the customer CSV export. Generate with
  `openssl rand -hex 32`. **Changing it invalidates every link already sent**,
  so set it once and leave it. Unset means the export's link column is empty
  and `/api/unsubscribe` answers 503.
- `NEXT_PUBLIC_SITE_URL` — optional. Overrides the site's own address, which
  defaults to `https://expresstvatt.se` (`lib/site-url.ts`) and is what the
  customer export's unsubscribe links are built from. Only set it on a real
  staging deployment that sends its own mail; setting it locally would put
  `localhost` links into a campaign.
- `GOOGLE_PLACE_ID` — the business's Google place id, for the landing page's
  reviews strip (`GET /api/reviews`). Optional: without it the route resolves
  the place by name, which costs an extra billed call and can match the wrong
  listing. Reviews sit on a **different Places SKU** from the address lookups,
  so the shared `GOOGLE_MAPS_API_KEY` may answer 403 until that SKU is enabled —
  the section then simply renders nothing. See `devNotes/LAUNCH_CHECKLIST.md`.

## Test accounts
Credentials are NOT kept in this repo — it is public, and anything committed here
stays in the git history forever even after it is removed. Ask the owner, or read
them from a local untracked file.

- **Admin**: the bootstrap `ADMIN_UID` account (see `.env.local`)
- **Test user**: a normal customer account

To place throwaway orders without a real payment, use a 0 kr test item instead of
a shared login — see the "test items" hint under Tjänster.
