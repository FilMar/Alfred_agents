# Style: tb/ti layered architecture and coding standards

```yaml
tags: [architecture, tb, ti, style, coding-standards]
sources: [tools/tb/CLAUDE.md, tools/ti/CLAUDE.md]
updated: 2026-08-18
```

## Description

Coding standards for the `tb` and `ti` tool codebases (`tools/tb/src/`, `tools/ti/src/`). `ti` was built to follow the same layering `tb` established first, so the two share one style page rather than duplicating it. Migrated 2026-07-27 from `tools/tb/CLAUDE.md` and `tools/ti/CLAUDE.md`, which are removed once this page is in place.

## How it is written

**Dependency direction (no circular imports)**, `tb`:

```
cli.ts → notes.ts → qdrant.ts → infra.ts
                 ↘             ↗
                   types.ts
```

`ti` mirrors this shape with `identity.ts` in place of `notes.ts`, and reuses `tb`'s `infra.ts` directly as a library (`HttpClient`, `QDRANT_URL`, `OLLAMA_URL`, `EMBED_MODEL`) rather than forking it — `ti` never modifies `tools/tb/`, only imports from it.

Layer responsibilities:
- **`infra.ts`** — HTTP client, config constants, client singletons, `embed()`, `checkHealth()`
- **`types.ts`** — pure types, enums, and pure functions (no I/O, no imports from other local files)
- **`qdrant.ts`** — Qdrant CRUD and search; no business logic
- **`notes.ts` / `identity.ts`** — business logic (create, update, search, browse); orchestrates qdrant + infra
- **`cli.ts`** — CLI surface only; no logic beyond parsing and formatting output

**Constants and config** — all magic numbers and strings must be named constants, placed by scope:
- Config values (URLs, timeouts, model names, collection name, limits) → `infra.ts`, exported
- Algorithm-local values (vocab size, traversal caps) → top of the file that uses them, unexported
- CLI-local values (poll retries, poll interval) → top of `cli.ts`, unexported

Never hardcode a value that is already defined as a constant elsewhere.

**Dead code** — exports never imported anywhere are dead: delete them, don't comment them out, don't keep them "for future use."

**DRY** — extract repeated logic into a private function at the top of the file. Examples applied in `tb`: `createIndices()` in `qdrant.ts` (was copy-pasted twice in `ensureCollection()`), `validateKind()` in `cli.ts` (used in `save`/`update`/`browse`), `errorMessage()` in `cli.ts` (used in every `catch` block).

**File size** — max ~400 lines per file; split on semantics (a coherent sub-responsibility), never arbitrarily. Conversely, merge micro-files (<~50 lines, single-purpose) into their closest logical neighbor rather than leaving them as separate modules.

**Readability**:
- Section headers with `// ─── Name ─────` separators to visually group related code
- One exported responsibility per section
- Imports grouped: node built-ins → local files
- No comments explaining *what* the code does — only *why*, when non-obvious

## How to extend

Adding a new command to `tb` or `ti`: check the equivalent command in `tools/tb/src/cli.ts` first for the established pattern (arg parsing, error handling, output format) — stay consistent, don't reinvent. Tests mock the HTTP client (same convention as `tests/tb.test.ts`/`tests/ti.test.ts`) — no test depends on a live Qdrant/Ollama instance.

Adding a new module in this family (after `ti`): follow the same four-layer split, reuse `infra.ts` rather than forking it, and add a style-page cross-reference here rather than a new per-module `CLAUDE.md`.

## Cross-references

- [ti_module](ti_module) — `ti`'s design decisions layered on top of this style
- [style_dual_entrypoint](style_dual_entrypoint) — the CLI+HTTP API pattern added on top of this layering
- [architettura](architettura) — where `tb`/`ti` sit in the overall system
