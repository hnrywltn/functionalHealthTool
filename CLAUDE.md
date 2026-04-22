# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint
npm run migrate    # Run DB migrations against local Postgres
npx tsc --noEmit   # Type-check without building
```

## Project

**Anna's Health Tool** — a private reference library for a functional health practitioner (Anna Stone, single primary user). Lets her organize supplements, labs, symptoms, and conditions, and navigate the relationships between them (e.g. symptom → biochemistry issue → supplement → confirming lab).

Built by Light Patterns (Henry Walton) for Anna Stone.

Stack: **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + pg (raw SQL)**

DB: local Postgres, database `annas_health_tool`. Connection string in `.env.local` as `DATABASE_URL`.

## Data Model

Seven entity types, all cross-referenceable:

- **supplements** — dosage, forms, mechanism of action, adverse effects, contraindications, brands, timing, testing
- **symptoms** — presenting symptoms, related biochemistry
- **diagnoses** — conditions/diagnoses (same concept to Anna)
- **labs** — what it measures, normal range, low/high interpretation, collection type
- **medications** — drug class, dosage, mechanism of action, side effects, contraindications, interactions
- **biochemical_markers** — normal range, low/high interpretation
- **protocols** — steps, duration

**Relationships:** All entity-to-entity links are stored in one generic `entity_relationships` table (`entity_type_a`, `entity_id_a`, `entity_type_b`, `entity_id_b`, `relationship_type`, `notes`). No FK enforcement on the UUID columns by design. Indexed on both `(entity_type_a, entity_id_a)` and `(entity_type_b, entity_id_b)` for fast lookup from either side. `relationship_type` is nullable — Anna will define types later.

## Architecture

```
app/                   # Next.js App Router
  layout.tsx
  page.tsx
  api/                 # Route handlers (GET/POST/PATCH/DELETE)

lib/
  db.ts                # pg Pool singleton
  migrate.ts           # Run with `npm run migrate` — idempotent CREATE IF NOT EXISTS

components/            # UI components (to be added)
```

## Key Patterns

**DB access:** Import `pool` from `lib/db.ts`. Use `pool.query()` for simple queries, `pool.connect()` + manual `BEGIN/COMMIT/ROLLBACK` for transactions.

**Migrations:** Add new `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE ADD COLUMN IF NOT EXISTS` statements to `lib/migrate.ts` and re-run. No migration framework — single idempotent script.

**Tailwind v4:** Uses `@import "tailwindcss"` in globals.css (not `@tailwind` directives). Theme tokens defined inside `@theme inline {}`.

**Navigation:** Multi-directional — any entity type can be the starting point. Each detail page shows all related entities across all other categories.
