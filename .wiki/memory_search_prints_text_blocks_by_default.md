---
tags: [memory, tb, ti, cli, format]
sources: [SPEC.md@c22c073, REVIEW.md@c22c073, tools/common/render.ts, tools/tb/src/cli.ts, tools/ti/src/cli.ts]
---

## Decision

`tb search` and `ti search` print text blocks. A block is a line `-- <id8>` and then the text: `what` and `why` for a note, the actions for a rule. Blocks follow one another with no separator at the end. With no result, nothing prints.

`--json` prints the full results as before. A rule has no vector in it.

`tb meta <id>` and `ti meta <id>` print one whole note or rule as JSON. The id is a full id or a unique prefix. The `meta` of an id equals the `note` field of the `--json` result for that id, and a test checks it.

`tools/common/render.ts` is the one module that knows the text format. The hooks call the CLI and add a header.

`browse`, `random`, `tags`, `list`, `refine` and the HTTP API keep their JSON output.

## Why

The agent pays for every character a CLI prints. In `tb search --limit 5`, `what`, `why` and the id were 26% of the characters. The other 74% was `refs`, `backrefs`, hit counters, dates and the model name. This was measured on two queries.

Nothing outside the repo read the output as JSON. Only the two hooks and one test did, and all three are changed. `td` and `tl` use the code of `tb` and `ti` as a library.

`--json` and `meta` answer two questions: what the query found, and everything about one note. They share one code path so the two outputs cannot drift apart.

The short id is 8 hex characters. It is unique for 798 of 798 notes and 71 of 71 rules. If two ids ever share a prefix, the CLI answers "Ambiguous" and lists the candidates. At about 10 000 notes the chance of one shared prefix is about 1%. Use 12 characters then.

## Cross-references

- [memory_hook_injects_only_the_text_the_agent_uses](memory_hook_injects_only_the_text_the_agent_uses) — what the hook shows and why
- [memory_ti_ids_accept_a_unique_prefix](memory_ti_ids_accept_a_unique_prefix) — why the short id has to work in `ti`
