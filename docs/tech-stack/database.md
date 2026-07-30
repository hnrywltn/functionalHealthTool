# Database

- **Engine:** Postgres (local), database name `annas_health_tool`
- **Driver:** [`pg`](https://node-postgres.com/) (`node-postgres`), raw SQL — **no ORM** (no Prisma, Drizzle, TypeORM, Sequelize, Knex, etc.)
- **Connection:** `lib/db.ts` — single `Pool` singleton, `connectionString` from `DATABASE_URL` in `.env.local`
- **Migrations:** no migration framework — `lib/migrate.ts` is one hand-written idempotent script (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`). Run with `npm run migrate`.
- **Seeding:** `lib/seed.ts`, run with `npm run seed`

## Tables

Entity tables (each: `id UUID PK default gen_random_uuid()`, `name TEXT NOT NULL`, entity-specific columns, `created_at` / `updated_at TIMESTAMPTZ`):

- `supplements`
- `symptoms`
- `diagnoses`
- `lab_tests`
- `laboratories`
- `medications`
- `biochemical_markers`
- `nutrition`
- `products`
- `protocols`
- `amino_acids`
- `genetics`
- `vendors`
- `anatomy_physiology`
- `ce` (continuing education)
- `equipment`
- `affiliations`
- `forms`
- `assessments`

Supporting/join tables:

- `entity_relationships` — generic cross-entity link table: `entity_type_a`, `entity_id_a`, `entity_type_b`, `entity_id_b`, `relationship_type` (nullable), `notes`. Indexed on both `(entity_type_a, entity_id_a)` and `(entity_type_b, entity_id_b)`. **No FK enforcement** on the UUID columns by design (they can point at any entity table).
- `attachments` — uploaded file metadata: `label`, `file_key` (R2 object key), `file_type`
- `entity_attachments` — join table, links `attachments` to any entity
- `tags` — free-form tag names
- `entity_tags` — join table, links `tags` to any entity

## Notable patterns

- Route handlers interpolate the entity table name directly into SQL (e.g. `` `SELECT * FROM ${entity}` ``), guarded by validating `entity` against `ENTITY_TYPES` (from `lib/entities.ts`) before the query runs — this is how one generic CRUD route handler serves all 19 entity tables.
- No row-level auth/permissions — single private user, no multi-tenancy.
