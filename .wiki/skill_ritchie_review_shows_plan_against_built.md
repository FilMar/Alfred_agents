---
tags: [skill, ritchie, review, render, graphify]
sources: [conversation, spikes/2026-11-04-plan-vs-built/main.py]
---

## Decision

The review page lays `spec.json` over the graphify graph, `.graph/graph.json`. Each spec entity gets one more field, `codice`: the folders or files that hold it, or `null` when it lives outside the repo. A file belongs to the entity with the longest matching path. When two entities share one file, a graph node belongs to the entity its symbol names. A method belongs to its class.

A flow counts as built in two cases. The graph has a code edge between the two folders (`imports`, `imports_from`, `calls`, `dynamic_import`, `indirect_call`). Or a text search finds a CLI call such as `tb search` in the files of the caller.

The page shows four states and no more:

- green: asked and built
- yellow: asked, not built yet
- red: built, not asked. A link in the code that the spec does not name, written on a line the work changed.
- grey: outside the repo, so it cannot be checked

How a link was found (an import or a CLI call) shows only on hover. This is a design target: no renderer exists yet outside the spike.

## Why

The spike ran on this repo with a twelve-entity spec. It found true things. `tools/th/src/archive.ts` imports `HttpClient` from `tools/tb/src/infra.ts`: that link was never declared. It also found two links the spec forgot (`tl` to `tb`, skills to `ti`). Finding these is the job of the review.

The first version had six colors, one for each kind of proof. At twelve entities it was hard to read. The user could not tell what "built, not asked" meant. The way a link was proven matters to the agent, not to the user. Four states can be read without hovering.

The first real review, moving `HttpClient` to `tools/common`, showed three gaps. A spec entity can be one file, not a folder. Two entities can share a file, so folders alone cannot tell them apart. Old links of a touched file are not news: red counts only the lines in the diff. With the three fixes, the review showed six green flows and no red.

The CLI search is needed because the tools call each other as commands, and graphify sees only imports. It is weak: it missed `bun "$td_cli" distill` in `extensions/tb_refine/distill.sh`, so a real flow showed as missing.

## Cross-references

- [The spec is shown, not written](skill_ritchie_spec_is_shown_not_written)
- [The review is the verdict packet](skill_ritchie_review_is_the_verdict_packet) — `Copertura della spec` and `Scostamenti` are what this page draws
- [Shared modules live in tools/common](style_shared_modules_live_in_tools_common_one_folder_for_contract_cli_and_tags) — the th to tb import breaks it
