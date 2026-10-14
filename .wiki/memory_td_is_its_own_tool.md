---
tags: [memory, distiller, td, tl, tools]
sources: [conversation, tools/tl/README.md, tools/tl/src/db.ts, tools/td/src/index.ts]
replaces: [memory_distiller_is_its_own_tool_td_and_tl_stays_the_register@927d184, memory_distiller_td_is_fourteen_components_behind_one_entry_point@c1dbd73]
---

## Decision

The distiller is its own tool, `tools/td/`, next to `tb`, `ti`, `tl` and `th`. It is a TypeScript library with a thin CLI on top. Everything goes through one entry point, `index.ts`. The CLI calls only what `index.ts` exports. `package.json` has `"td": "./tools/td/src/cli.ts"`, like the other four.

| | `tl`, the archive and the register | `td`, the distiller |
|---|---|---|
| tables `extractor` and `extractions` | yes, in `migrate()` | no |
| API and client functions | yes | uses them |
| config struct and its check | no, only `json_valid` | yes, on write and on read |
| pipeline, model calls, searches in `tb` and `ti` | no | yes, `tb` and `ti` as modules |
| CLI | unchanged | `td extractor add`, `show`, `activate`; `td distill` |

The API changes a row of `extractor` in one way only: a `PATCH` that sets `active`.

Inside `td`, the pure parts (config, checks, parsing, the rule on `extends`) have no I/O and are tested with bare calls. The parts that call a model or a store are thin. The Distiller holds only the order of the steps. The config, the checks and the recorder are built first, so the shadow run has data from the first call.

## Why

`tl` never distills. Its README says so, and `db.ts` says "rows in, rows out". The distiller reads `tl`, `tb` and `ti` and calls a model. Inside `tl`, the archive would depend on the whole memory stack. `th` already uses `tl` the same way, as a library through `client.ts`.

If `tl` checked the config, the archive would have to know the shape of the distiller. So `td` checks the config before it writes the row and after it reads it, and `tl` only stops broken JSON.

One entry point means the CLI and a library user cannot drift apart.

One component per reason to change keeps each part small and easy to test.
