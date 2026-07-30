# Tech Stack Docs

Reference documentation for how this app is built — dependencies, database access, API design, and file storage. This is a snapshot of the current architecture, not a spec to build towards; when the code changes, update these docs alongside it.

- [`npm-packages.md`](./npm-packages.md) — every runtime and dev dependency, what it's for
- [`database.md`](./database.md) — Postgres access, migration pattern, schema shape, the `entity_relationships` table
- [`api.md`](./api.md) — every route handler, method, params, and response shape
- [`architecture.md`](./architecture.md) — how the pieces fit together (Next.js App Router, no middleware, no ORM, no auth layer yet)

There are no Python packages in this project — it's a single Next.js/TypeScript codebase, nothing polyglot.
