# API

Next.js App Router route handlers under `app/api/`. All export `dynamic = "force-dynamic"` (no static caching — every request hits Postgres/R2 live). All responses are JSON via `NextResponse.json()`. No API versioning, no auth/session checks on any route.

| Route | Methods | Purpose |
|---|---|---|
| `/api/entities/[entity]` | GET, POST | List all rows / create a row for one of the 19 entity tables |
| `/api/entities/[entity]/[id]` | GET, PATCH, DELETE | Fetch / update / delete a single entity row |
| `/api/relationships` | GET, POST, DELETE | Read relationships for an entity (either side of `entity_relationships`), create a link, delete a link |
| `/api/entity-tags` | GET, POST, DELETE | List tags on an entity, tag an entity (upserts the tag by name), remove a tag |
| `/api/tags` | GET | List all tags |
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
- No middleware layer (see [`architecture.md`](./architecture.md)) — no auth, rate limiting, or logging middleware runs in front of these routes.
