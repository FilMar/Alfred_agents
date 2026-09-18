---
tags: [style, tb, ti, architecture, coding-standards]
sources: [tools/tb/src/notes.ts, tools/tb/src/qdrant.ts, tools/ti/src/identity.ts]
---

## Decision

Coding standards for the `tb` and `ti` codebases (`tools/tb/src/`, `tools/ti/src/`). `ti` was built to follow the layering `tb` established first, so the two share one style decision.

**Dependency direction, no circular imports** (`tb`; `ti` mirrors it with `identity.ts` in place of `notes.ts`):

```
cli.ts → notes.ts → qdrant.ts → infra.ts
                 ↘             ↗
                   types.ts
```

- `infra.ts` — HTTP client, config constants, client singletons, `embed()`, `checkHealth()`
- `types.ts` — pure types, enums, pure functions (no I/O, no local imports)
- `qdrant.ts` — Qdrant CRUD and search, no business logic
- `notes.ts` / `identity.ts` — business logic; orchestrates qdrant + infra
- `cli.ts` — CLI surface only; parsing and formatting, nothing more

`ti` reuses `tb`'s `infra.ts` directly as a library, never forks it, never modifies `tools/tb/`.

**Constants and config** — no magic values: config (URLs, timeouts, models, collection, limits) exported from `infra.ts`; algorithm-local values at the top of the file that uses them, unexported; CLI-local values at the top of `cli.ts`. Never hardcode a value that exists as a constant elsewhere.

**Dead code**: exports never imported are dead — delete, don't comment out, don't keep "for future use".

**DRY**: repeated logic becomes a private function at the top of the file.

**File size**: max ~400 lines per file, split on semantics; merge micro-files (<~50 lines) into their closest logical neighbor.

**Readability**: `// ─── Name ───` section headers; one exported responsibility per section; imports grouped (node built-ins → local); comments explain *why*, never *what*.

## Why

Four layers with one-way imports keep every responsibility testable in isolation: tests mock the HTTP client (same convention as `tests/tb.test.ts`/`tests/ti.test.ts`), so no test depends on a live Qdrant/Ollama. To extend, check the equivalent command in `tools/tb/src/cli.ts` first — stay consistent, don't reinvent. A new module in this family follows the same four-layer split and reuses `infra.ts` rather than forking it.

## Cross-references

- [style_dual_entrypoint](style_dual_entrypoint) — the entry-point pattern layered on top
- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — where `tb`/`ti` sit in the system