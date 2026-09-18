---
tags: [memory, procedural, strategy]
sources: [conversation, .wiki/procedural_memory_gaps.md]
---

## Decision

Grow new procedural-memory components on top of data, not hypotheses. Three moves, cheapest first:

1. **Unify the event log first** — closes gap 5, then gap 1. One store, not three telemetries. Founded as `tl` (2026-07-21): a standalone REST service instead of extending `th.db`, with `th.db` removed entirely. The skill-invocation hook was explicitly deferred — gap 1 is not closed by `tl` alone.
2. **Human-in-the-loop procedure extraction** — gaps 2-3. A "procedural Platone": after a successful task, distill the action sequence (not the concept), propose it to the user. Minimal version: save procedures in `tb` with kind `protocollo`, trigger context explicit in the `what`. A dedicated store only when evidence shows semantic retrieval is insufficient.
3. **Revision loop and member↔skill promotion only when data exists** — gaps 4, 6. Deprecation heuristics written today would be speculation; keep them on the roadmap.

Anti-pattern to avoid: starting from moves 2 or 3 because they are the most interesting — without move 1 you build intelligence on data that does not exist.

## Why

The only missing infrastructure was the unified event log; everything else (member tracking in `th.db`, `tb`'s `protocollo` kind, Efesto for authoring) already exists. The same principle is already applied in the orchestrator: static analysis first, sandboxed dynamic execution only if needed — log first, intelligence after.

## Cross-references

- [memory_procedural_six_gaps](memory_procedural_six_gaps) — the diagnosis this strategy answers
- [memory_tl_unified_event_log](memory_tl_unified_event_log) — move 1, founded
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — move 2's minimal form, partially founded