## Deployment
See `devNotes/BEFORE_DEPLOYMENT.md` for known security and data issues that must be resolved before going live. Includes exact code fixes for each item.

## Default target
Unless the user says "mobile", "app", "iOS", or "Expo", always assume changes are for the **website** (`app/` — Next.js). Never touch `skraddare-app/` unless explicitly asked. The app is not live yet, which is why web-only changes are fine — but they leave debt, see below.

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

## Booking time windows
Admin-editable under Inställningar → "Tider för upphämtning & avlämning" (`app/admin/(dashboard)/settings/TimeSlotsPanel.tsx`). Pickup and delivery keep **separate** lists; each card has a mirror button that copies its list over the other one.
- `lib/timeslots.ts` is the single source of truth — types, defaults (`08-12`/`12-16`/`16-20`), `"HH-HH"` ⇄ `{start,end}` conversion, the strict `validateSlots()` used on save and the lenient `normalizeSlots()` used on read.
- Firestore `settings/timeslots` → `{ pickup: [{start,end}], delivery: [{start,end}] }`, whole hours 0–24.
- Orders still store the span string (`"08-12"`), so orders/driver/calendar were untouched.
- Rules: gaps are fine (08–12 + 14–16 leaves 12–14 unbookable), overlaps are rejected, an empty list is rejected (it would make booking impossible), max 12 windows. Enforced in the panel *and* re-checked in `POST /api/admin/timeslots`; a corrupt doc falls back to the defaults on read so checkout can never end up with nothing to book.
- Routes: `GET/POST /api/admin/timeslots` (admin) · `GET /api/timeslots` (public, for the pickers — `settings` is not client-readable per `firestore.rules`).
- The iOS app reads the same list: `skraddare-app/lib/timeslots.ts` (hand-copied mirror — keep the two in sync) feeds `TimeSpanPickerModal`/`CheckoutScreen`. Because both clients agree, `create-cart-payment` rejects a pickup or delivery time that is not on the admin's list; an empty time or a failed settings read skips the check rather than blocking checkout.

## Admin dashboard (`app/admin/`)
Protected by `middleware.ts` + cookie-based session (`admin-session`).
Multi-admin: admins live in the Firestore `admins/{uid}` collection (managed server-side via Admin SDK). `ADMIN_UID` is the bootstrap/root admin so the owner can never be locked out. `lib/admin-auth.ts` (`isAdminUid`/`getAdminSession`/`getAdminRole`/`mustChangePassword`) is the single source of truth for admin checks.

Roles (`lib/admin-roles.ts`): `developer` | `huvudadmin` | `admin`. `developer` is not assignable — it is applied in code to `ADMIN_UID`, which also displays as `ROOT_DISPLAY_NAME` ("Carl") instead of its email. It carries identical authority to `huvudadmin`. `canManageAdmins()` gates adding, removing, password resets and role changes to those two roles; a plain `admin` gets the list read-only. Nobody may change or remove **their own** role/access (`uid === session.uid` is rejected), which is what makes self-lockout impossible. `POST /api/admin/admins/role` changes a role.
Auth flow: Firebase client auth → POST `/api/admin/session` (accepts the bootstrap UID **or** any `admins/{uid}` entry) → sets httpOnly cookie.
Add-admin flow: Settings → "Administratörer" → `POST /api/admin/admins`. If the email already has a Firebase Auth account (usually a customer login) it is **promoted** — an `admins` doc is created with `mustChangePassword:false` and they keep their existing password. Otherwise a new Auth user is created with a one-shot temp password from `lib/temp-password.ts` (8 chars — Firebase rejects anything under 6, which is why the old 4-digit codes always failed) + an `admins` doc with `mustChangePassword:true`. `POST /api/admin/admins/reset-password` reissues a temp password when the original is lost; the bootstrap `ADMIN_UID` is excluded. The dashboard layout gate (`(dashboard)/layout.tsx`) redirects such admins to `/admin/change-password` (non-skippable) until they set a real password via `POST /api/admin/change-password`.
See `structure.md` for full file map.

## Env vars
- `ADMIN_UID` — Firebase UID of the bootstrap/root admin (in `.env.local`)

## Test accounts
Credentials are NOT kept in this repo — it is public, and anything committed here
stays in the git history forever even after it is removed. Ask the owner, or read
them from a local untracked file.

- **Admin**: the bootstrap `ADMIN_UID` account (see `.env.local`)
- **Test user**: a normal customer account

To place throwaway orders without a real payment, use a 0 kr test item instead of
a shared login — see the "test items" hint under Tjänster.
