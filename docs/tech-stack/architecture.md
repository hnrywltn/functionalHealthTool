# Architecture

## Framework

- **Next.js 16** (App Router), TypeScript, React 19
- `app/` — pages (`app/[entity]/`, `app/[entity]/[id]/`, `app/tags/`, `app/tags/[name]/`, `app/references/`) and API route handlers (`app/api/`)
- `lib/` — shared server code (`db.ts`, `r2.ts`, `entities.ts`, `migrate.ts`, `seed.ts`)
- `components/` — UI components

## ORM

**None.** Database access is raw SQL via the `pg` driver (`lib/db.ts`). See [`database.md`](./database.md).

## Proxy (middleware)

`proxy.ts` (Next 16's name for middleware) runs on every request except `_next/static`, `_next/image` and `favicon.ico`. It verifies the session JWT; without a valid one, pages redirect to `/login?next=…` and `/api/*` returns `401 {"error":"Unauthorized"}`. Signed-in visits to `/login` redirect to `/`.

## Auth

Email + password login for a single user (Anna, `annastone@me.com`).

- `users` table (`email` unique, `password_hash` bcrypt cost 12).
- `app/login/` — login page and server actions `login` / `logout`. Sign out lives at the bottom of the sidebar.
- `lib/session.ts` — HS256 JWT signed with `SESSION_SECRET` (env var, required), stored in an httpOnly `session` cookie for 30 days. Stateless: rotating `SESSION_SECRET` signs everyone out.
- Passwords are set or reset with `npm run set-password -- <email>` (hidden prompt). No sign-up or reset-by-email flow.

## Billing (Stripe)

Anna pays monthly, either with **auto-pay** (a Stripe Subscription on `STRIPE_MONTHLY_PRICE_ID`) or by **paying one month at a time** (a PaymentIntent for the amount of `STRIPE_ONE_OFF_PRICE_ID`). Card entry uses the embedded Payment Element on `/payments`. The webhook is the source of truth: it writes `payments` rows and syncs subscription status. `lib/billing.ts` computes paid-through date and a reminder state; `components/payments/PaymentBanner.tsx` (in the root layout) shows a small banner when payment is due within 5 days (if not on auto-pay), overdue, or auto-pay failed. **Access is never blocked.** The account menu (top right, `components/AccountMenu.tsx`) links to `/payments`.

**Super admin:** users with `is_super_admin` (Henry, `admin@lightpatternsonline.com`; set in SQL only) see an Admin link instead of Payments, never get the banner, and can use `/admin` (`app/admin/`) to record a payment row by hand (type, amount, months, optional start date, optional Stripe ID) or delete one. Pasting the Stripe `pi_…`/`in_…` ID means a late webhook for the same payment is ignored. Non-admins get a 404 there.

Env: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (local: from `stripe listen`), `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ONE_OFF_PRICE_ID`. Local `.env.local` runs in **live mode** (real charges). Local webhooks: `~/.local/bin/stripe listen --live --project-name healthref --latest --forward-to localhost:3000/api/webhooks/stripe` (the CLI won't accept an `sk_live` key for `listen`; the `healthref` CLI project login keeps screenScribe's default CLI login untouched).

## File storage

- **Cloudflare R2** (S3-compatible), accessed via `@aws-sdk/client-s3` — see `lib/r2.ts`
- Uploads go through `/api/upload`, downloads are served via short-lived signed URLs from `/api/files/[...key]`
- File metadata (label, key, type) lives in the `attachments` Postgres table, separate from the R2 object itself

## Styling

- **Tailwind CSS v4** — uses `@import "tailwindcss"` in `globals.css`, not the old `@tailwind` directives. Theme tokens are defined inside `@theme inline {}`.

## Data model shape

Seven "primary" entity concepts described in the top-level `CLAUDE.md` (supplements, symptoms, diagnoses, labs, medications, biochemical markers, protocols) have since grown to 19 entity tables total (see [`database.md`](./database.md)), all following the same shape and all cross-linked through one generic `entity_relationships` table rather than per-pair join tables.
