---
tags: [memory, ti, qdrant, rules]
sources: [conversation, tools/ti/src/identity.ts, tools/ti/src/qdrant.ts, tests/ti.test.ts]
---

## Decision

`ti` (Third Identity, implemented 2026-07-21) is a thin CLI over a dedicated Qdrant collection `pi_identity` storing context→action rules — distinct from `tb`'s semantic memory. Schema: `if` (the only embedded field), `do` (plain payload, array), `tags` (payload filter). No note-linking.

`do` covers three forms: a behavior/attitude, a dispatch to a skill or `th` member, or a `tb` lookup hint (a search term, never a frozen note id). Deliberately a dumb client: no auto-merge, no similarity judgment, no LLM call inside the CLI — the merge/dedup decision stays with the caller, same discipline as `tb search` → `tb add`. Reuses `tools/tb/src/infra.ts` as a library without modifying it.

## Why

`tb` answers "what do I know about X"; it does not answer "what should happen given context X". Mixing the two retrieval patterns in one collection degrades both: behavioral queries get diluted by semantic noise, semantic queries get cluttered with situational one-offs. `ti` is the concrete resolution of gaps 3 and 4 from [memory_procedural_six_gaps](memory_procedural_six_gaps) — narrower than the full move-2 plan, human-in-the-loop by design, consistent with log-first intelligence-after.

Implementation note worth keeping: a live smoke test against the real Qdrant on the Rasp (2026-07-21) found three response-shape bugs the mocked suite could not catch — the mocks were written to match the code's assumptions. Mocks prove the code matches itself; only the live service proves it matches the world.

Pending work: a native `--min-score` parameter for `ti search` (and `tb search`) — filtering belongs at the source of the score, not bolted onto callers. On the roadmap.

## Cross-references

- [memory_procedural_six_gaps](memory_procedural_six_gaps) — the gap analysis `ti` extends
- [memory_tb_ti_on_rasp](memory_tb_ti_on_rasp) — the Qdrant instance `ti` shares with `tb`
- [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) — how `ti` rules reach the agent before every prompt
- [memory_tl_unified_event_log](memory_tl_unified_event_log) — the raw facts `tl` would feed `ti`'s distillation