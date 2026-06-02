## Deployment
See `devNotes/BEFORE_DEPLOYMENT.md` for known security and data issues that must be resolved before going live. Includes exact code fixes for each item.

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

## Admin dashboard (`app/admin/`)
Protected by `middleware.ts` + cookie-based session (`admin-session`).
Auth flow: Firebase client auth → POST `/api/admin/session` (verifies UID against `ADMIN_UID` env var) → sets httpOnly cookie.
See `structure.md` for full file map.

## Env vars
- `ADMIN_UID` — Firebase UID of the admin user (in `.env.local`)
