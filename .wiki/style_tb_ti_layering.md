---
tags: [style, tb, ti, architecture, coding-standards]
sources: [tools/tb/src/notes.ts, tools/tb/src/qdrant.ts, tools/ti/src/identity.ts]
---

## Decision

Coding standards for the `tb` and `ti` codebases. `ti` was built to follow the layering that `tb` set first, so the two share one style decision.

**Dependency direction, no circular imports** (`ti` mirrors `tb`, with `identity.ts` in place of `notes.ts`):

```
cli.ts → notes.ts → qdrant.ts → infra.ts
                 ↘             ↗
                   types.ts
```

- `infra.ts`: HTTP client, config constants, client singletons, `embed()`, `checkHealth()`.
- `types.ts`: pure types, enums and pure functions. No I/O, no local imports.
- `qdrant.ts`: Qdrant CRUD and search. No business logic.
- `notes.ts` / `identity.ts`: business logic. It orchestrates qdrant and infra.
- `cli.ts`: the CLI surface only. Parsing and formatting.

`ti` reuses `infra.ts` of `tb` as a library. It never forks it and never modifies `tools/tb/`. Other rules:

- **No magic values.** Config is exported from `infra.ts`. Algorithm-local values sit at the top of the file that uses them, unexported. Never hardcode a value that exists as a constant elsewhere.
- **Dead code:** an export nobody imports is dead. Delete it. Do not comment it out.
- **DRY:** repeated logic becomes a private function at the top of the file.
- **File size:** about 400 lines at most. Split on semantics. Merge micro-files (under about 50 lines) into their closest neighbour.
- **Readability:** `// ─── Name ───` section headers, one responsibility per section, imports grouped. Comments explain why, never what.

## Why

Four layers with one-way imports keep every responsibility testable alone: tests mock the HTTP client, so no test depends on a live Qdrant or Ollama. To extend, check the equivalent command in `tools/tb/src/cli.ts` first and stay consistent. A new module in this family follows the same split and reuses `infra.ts`.

## Cross-references

- [style_dual_entrypoint](style_dual_entrypoint) — the entry-point pattern layered on top
- [core_orthogonal_layers_no_overlap](core_orthogonal_layers_no_overlap) — where `tb`/`ti` sit in the system
