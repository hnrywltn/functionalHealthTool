# API

Next.js App Router route handlers under `app/api/`. All export `dynamic = "force-dynamic"` (no static caching — every request hits Postgres/R2 live). All responses are JSON via `NextResponse.json()`. No API versioning. Auth is enforced by `proxy.ts` before any route runs; requests without a valid session get `401`.

| Route | Methods | Purpose |
|---|---|---|
| `/api/entities/[entity]` | GET, POST | List all rows / create a row for one of the 19 entity tables |
| `/api/entities/[entity]/[id]` | GET, PATCH, DELETE | Fetch / update / delete a single entity row |
| `/api/relationships` | GET, POST, DELETE | Read relationships for an entity (either side of `entity_relationships`), create a link, delete a link |
| `/api/entity-tags` | GET, POST, DELETE | List tags on an entity, tag an entity (upserts the tag by name), remove a tag |
| `/api/tags` | GET | List all tags |
| `/api/stripe/create-subscription` | POST | Start monthly auto-pay. Returns `{ clientSecret, mode }`: `mode: "payment"` charges the first month now; `mode: "setup"` (when already paid ahead) only saves the card, with a trial until the paid period ends. Cancels any earlier unfinished attempt first |
| `/api/stripe/create-payment-intent` | POST | Pay one month, no saved card. Amount comes from the one-off Price in Stripe; `metadata.source = "one_off_month"` |
| `/api/stripe/cancel-subscription` | POST | Turn off auto-pay at period end, or `{ resume: true }` to undo. DB updated by the webhook, not here |
| `/api/webhooks/stripe` | POST | **Excluded from `proxy.ts`** — Stripe has no session. Signature-verified against the raw body. Idempotent via `stripe_webhook_events`. Records `payments` rows from `payment_intent.succeeded` (one-off only) and `invoice.paid` (monthly price, non-zero only); syncs subscription status from `customer.subscription.updated`/`.deleted` |
| `/api/tags/[name]` | GET | All entities (grouped by type) carrying a given tag |
| `/api/entity-attachments` | GET, POST, DELETE | List attachments on an entity, attach one, detach one (detach also garbage-collects the `attachments` row if orphaned) |
| `/api/attachments` | GET, POST | List all attachments (with their linked entities), create an attachment record |
| `/api/attachments/[id]` | PATCH, DELETE | Rename / delete an attachment record |
| `/api/upload` | POST | Upload a file (multipart `FormData`) to R2, returns the object key |
| `/api/files/[...key]` | GET | Redirects to a signed, time-limited (1hr) R2 download URL for a given key |
| `/api/search` | GET | Search by name/description across one or all entity types (`?q=`, optional `?entity=`) |

## Conventions

- Dynamic route params are `Promise`-typed and awaited (Next.js 16 App Router convention): `{ params }: { params: Promise<{ id: string }> }`.
- Entity type strings are validated against `ENTITY_TYPES` (`lib/entities.ts`) before being interpolated into SQL — this is the only guard against arbitrary table access.
- No request validation library (no Zod, Yup, etc.) — bodies are destructured directly from `req.json()`.
- `proxy.ts` (see [`architecture.md`](./architecture.md)) gates every route on a valid session. No rate limiting or logging layer.
