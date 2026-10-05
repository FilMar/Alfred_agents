---
tags: [memory, distiller, td, tl, tools, library]
sources: [conversation, tools/tl/README.md, tools/tl/src/db.ts, package.json]
---

## Decision

The distiller is its own tool, `tools/td/`, next to `tb`, `ti`, `tl` and `th`. It is a TypeScript library with a thin CLI on top.

```
tools/td/src/
  index.ts      the library: exports Distiller, ExtractorConfig and the row types
  distiller.ts  Distiller: the pipeline
  config.ts     ExtractorConfig and its parts
  cli.ts        commander; calls only what index.ts exports
```

`package.json` gets `"td": "./tools/td/src/cli.ts"`, like the other four. A script or a pi extension imports the library and never needs the CLI.

Who does what:

| | `tl`, the archive and the register | `td`, the distiller |
|---|---|---|
| the tables `extractor` and `extractions` | yes, in `migrate()` | no |
| the API and the client functions | yes: write an extractor, read it, change `active`, write extractions | uses them |
| the config struct and its check | no: only `json_valid` | yes, on write and on read |
| the pipeline, the LLM calls, the searches in `tb` and `ti` | no | yes |
| CLI | unchanged | `td extractor add`, `show`, `activate`; `td distill --session` |

The API changes a row of `extractor` in one way only: a `PATCH` that sets `active`.

## Why

**`tl` never distills.** Its README says so, and `db.ts` says "no business logic: rows in, rows out". The distiller reads `tl`, `tb` and `ti` and calls a model. Inside `tl`, the archive would depend on the whole memory stack. `th` already uses `tl` the same way, as a library through `client.ts`.

**The config struct lives in `td`.** If `tl` checked it, the archive would have to know the shape of the distiller. So `td` checks the config before it writes the row and again after it reads it. `tl` only stops broken JSON.

**One entry point.** The pipeline is one class behind `index.ts`. The CLI is a shell over the same calls, so the CLI and a library user cannot drift apart.

**Open point.** `tb` and `ti` have no search function to use as a library over HTTP. `searchNotes` in `tb` talks to Qdrant directly, and the spikes called the CLI. This is settled when the neighbour search of phase 2a is written.

## Cross-references

- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — the two tables `tl` holds
- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — what `Distiller` runs
- [memory_extractor_calls_go_through_pi_ai_with_reasoning_low](memory_extractor_calls_go_through_pi_ai_with_reasoning_low) — how `td` calls a model
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — what `tl` is
