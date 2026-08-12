## Deployment
See `devNotes/BEFORE_DEPLOYMENT.md` for known security and data issues that must be resolved before going live. Includes exact code fixes for each item.

## Default target
Unless the user says "mobile", "app", "iOS", or "Expo", always assume changes are for the **website** (`app/` — Next.js). Never touch `skraddare-app/` unless explicitly asked.

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
- Kassa (`app/kassa/page.tsx`) fetches `customers/{uid}` on auth to show a profile card and pre-fill contact fields. `notes` textarea is the single source of truth — no separate careOf field.

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
- **Admin**: zupimcarl@gmail.com / wallahi007
- **Test user**: testgubbe44@gmail.com / password123
