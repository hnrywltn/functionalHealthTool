# Architecture

## Framework

- **Next.js 16** (App Router), TypeScript, React 19
- `app/` — pages (`app/[entity]/`, `app/[entity]/[id]/`, `app/tags/`, `app/tags/[name]/`, `app/references/`) and API route handlers (`app/api/`)
- `lib/` — shared server code (`db.ts`, `r2.ts`, `entities.ts`, `migrate.ts`, `seed.ts`)
- `components/` — UI components

## ORM

**None.** Database access is raw SQL via the `pg` driver (`lib/db.ts`). See [`database.md`](./database.md).

## Middleware

**None.** There is no `middleware.ts` at the project root — no request interception, no auth gate, no rewrites/redirects at the middleware layer. Every route handler runs unguarded.

## Auth

**None currently implemented.** This is a single-user private tool (Anna Stone) run either locally or on a private deployment — there's no login, session, or user model in the schema. `jose` and `bcryptjs` are installed as dependencies but not used anywhere yet (likely staged for future auth work — see [`npm-packages.md`](./npm-packages.md)).

## File storage

- **Cloudflare R2** (S3-compatible), accessed via `@aws-sdk/client-s3` — see `lib/r2.ts`
- Uploads go through `/api/upload`, downloads are served via short-lived signed URLs from `/api/files/[...key]`
- File metadata (label, key, type) lives in the `attachments` Postgres table, separate from the R2 object itself

## Styling

- **Tailwind CSS v4** — uses `@import "tailwindcss"` in `globals.css`, not the old `@tailwind` directives. Theme tokens are defined inside `@theme inline {}`.

## Data model shape

Seven "primary" entity concepts described in the top-level `CLAUDE.md` (supplements, symptoms, diagnoses, labs, medications, biochemical markers, protocols) have since grown to 19 entity tables total (see [`database.md`](./database.md)), all following the same shape and all cross-linked through one generic `entity_relationships` table rather than per-pair join tables.
