# Anna Meeting Notes

## Context

Anna is privacy-conscious and prefers not to use online services that collect user data (Google, Zoom, etc.). This shapes every tool and integration decision.

The app is hosted for reference, but document processing will use a **local LLM on Anna's machine** — documents never leave her computer.

---

## Decisions — Confirmed (email 2026-04-22)

### Labs — Field Structure
Anna's example: **DHA Lab → KQU (Kryptopyrrole Quantitative Urine)**

Fields for a lab test record:
- Lab company (e.g. DHA Lab) + contact info + website
- Test name + description
- Instructions (PDF link/attachment)
- Sample report (PDF link/attachment)
- Cost
- Turnaround time
- Indications (when to order it)
- Lab requisition info
- Lab results interpretation (low/high)
- Links to related diagnoses/conditions (e.g. Pyroluria)

> Note: Labs have a two-level structure — **laboratory company** → **individual tests**. A single lab company (DHA Lab) offers many tests (KQU is one of many).

### Supplements — "Also Consider" Field
Confirmed: "Also consider X" = a relationship link to another supplement (e.g. GABA → also consider L-Theanine). Implemented via `entity_relationships` table, not a freeform text field.

GABA fields apply broadly to most supplements.

### Search & Navigation
Both navigation modes confirmed:
- **Symptom-first** (existing plan)
- **Direct search by name** — search bar or A-Z list

### Medications
Omitted from first build. ✓

### Brand Colors
| Role | Hex | Name |
|---|---|---|
| Background / main | `#FEFEFA` | Porcelain |
| Primary accent (buttons, links, highlights) | `#CFDBD5` | Alabaster Grey |
| Secondary accent | `#333533` | Graphite |

---

## Local Processing Architecture (proposed)

When Anna is at her machine with Ollama running:

- The hosted app detects Ollama at `localhost:11434` automatically
- A "Local Processing" indicator goes green — no toggle, no login
- Document upload features unlock
- Documents go: **her filesystem → her browser → local Ollama → review screen → hosted DB**
- When Ollama isn't running, those features gray out gracefully

Anna's documents never touch an external server even though the app is hosted.

---

## Document Ingestion Flow (proposed)

1. Anna uploads one or many files (PDF, Word, plain text)
2. Ollama extracts structured data using the entity schemas (supplements, labs, symptoms, etc.)
3. App presents a **review screen** — proposed records with all fields visible
4. Anna approves, edits, or discards each record
5. Approved records save to the DB

One document can produce multiple records across multiple entity types.

---

## Still Open

### About her documents
- [ ] What formats are her 10k documents in? (PDF, Word, web clips, her own notes?)
- [ ] Are they organized in folders by category or mixed together?
- [ ] Does she want to process them all at once or in batches by topic?
- [ ] How much does she trust AI extraction — comfortable reviewing and approving, or verify field by field?

### About her machine
- [ ] What kind of machine does she have? (Mac/Windows, RAM, GPU?)
- [ ] Is she comfortable installing Ollama herself or does that need to be set up for her?

### About hosting
- [ ] Where should the app live? (VPS, home server, office network?)
- [ ] Does she need access on mobile / tablet or just desktop?
- [ ] Who maintains it if something breaks?

### Decisions Still Pending
| Decision | Options | Notes |
|---|---|---|
| Hosting | VPS (Hetzner etc.), home server, office server | Avoid platforms with analytics/data collection |
| Ollama model | Llama 3.1 8B, Mistral 7B, larger if GPU allows | Bigger model = better extraction quality |
| Lab company — separate entity type? | Own table vs. just a field on lab test | Two-level structure suggests its own type |
