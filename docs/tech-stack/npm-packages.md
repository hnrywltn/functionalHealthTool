# npm Packages

As of the versions pinned in `package.json`. Run `npm ls <pkg>` or check `package.json` directly for current versions — don't trust this doc's version numbers blindly over time.

## Runtime dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | 16.2.4 | App framework — App Router, route handlers, dev/build/start |
| `react` / `react-dom` | 19.2.4 | UI rendering |
| `pg` | ^8.20.0 | Raw Postgres driver — no ORM. See [`database.md`](./database.md) |
| `@aws-sdk/client-s3` | ^3.1037.0 | S3-compatible client, used against Cloudflare R2 for file storage |
| `@aws-sdk/s3-request-presigner` | ^3.1037.0 | Generates signed download URLs for R2 objects |
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | ^6.3.1 / ^10.0.0 / ^3.2.2 | Drag-and-drop — used for the entry References drag & drop UI |
| `bcryptjs` | ^3.0.3 | Password hashing — **installed but not currently wired up anywhere in `app/` or `lib/`** |
| `jose` | ^6.2.2 | JWT signing/verification — **installed but not currently wired up anywhere**. Likely intended for future auth since this app currently has no auth layer at all (single private user, run locally) |
| `jspdf` | ^4.2.1 | Client-side PDF generation |
| `lucide-react` | ^1.8.0 | Icon set used throughout the UI |

## Dev dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | ^5 | Type-checking (`npx tsc --noEmit`) |
| `tailwindcss` + `@tailwindcss/postcss` | ^4 | Styling — v4 syntax, see [`architecture.md`](./architecture.md#tailwind-v4) |
| `eslint` + `eslint-config-next` | ^9 / 16.2.4 | Linting (`npm run lint`) |
| `tsx` | ^4.21.0 | Runs TypeScript scripts directly — used for `migrate` and `seed` npm scripts |
| `dotenv` | ^17.4.2 | Loads `.env.local` into `lib/migrate.ts` and `lib/seed.ts` (Next.js itself loads env vars automatically for the app; these standalone scripts need it manually) |
| `@types/*` | — | Type definitions for `node`, `react`, `react-dom`, `pg`, `bcryptjs` |

## Python packages

None. This is a pure Next.js/TypeScript project — there is no Python anywhere in the repo (no `.py` files, no `requirements.txt`, no `pyproject.toml`).
