---
tags: [memory, tb, link, refs, hubs, aristotele, architecture, idea]
sources: [conversation, tools/tb/src/types.ts, tools/tb/SPEC.md]
---

## Decision

This is a possible architecture, not a settled one. No code exists yet. It records the shape agreed in conversation, so the next design session starts from it.

`aristotele` is replaced by a command, `tb link`, plus one LLM pass. The work is split by its nature. Code does what is deterministic. The LLM does only the judgment.

| Job | Nature | Where |
|---|---|---|
| Find notes with few refs | deterministic | `tb link` |
| Find near candidates for a note (vectors already in Qdrant) | deterministic | `tb link` |
| Say if a bridge is real and write its `reason` | judgment | one `th` run, one hat, input is pairs |
| Find saturated clusters | deterministic | `tb link`, later |
| Write the text of a hub | judgment | LLM, later |

Rules of the design:

- `tb link` follows the shape of `tb refine`: pure functions, I/O at the edge, dry run first, `--apply` only after two or three dry runs are read.
- The dry run prints candidate pairs as JSON. It writes nothing.
- The LLM sees pairs, never the whole graph.
- An accepted pair becomes a ref through `tb update --add-ref`. The `Link` already has an `origin` field. An automatic ref sets `origin` to the name of the step, for example `tb-link`. Every automatic edge is then known and can be undone.
- A cap on refs written per run, for example 20.
- Order on the timer: `td distill`, then `tb link`, then `tb refine`. New refs feed `hits_related` before `refine` reads the counters.
- Hubs come last. First measure how many saturated clusters exist once `tb link` runs. If there are few, hubs stay manual.

When this is built, `aristotele` is retired. `platone` and `erodoto` are retired by the distiller, as in [memory_distillation_stays_manual_for_now](memory_distillation_stays_manual_for_now).

## Why

`aristotele` does three things. Only one of them needs judgment. Running all three through an LLM on the whole graph is costly and hard to audit. Splitting by nature keeps the LLM call small, and keeps every write traceable.

`tb refine` measures if a note is alive. `aristotele` shapes the graph: links, hubs, isolated notes. They are different problems, so `refine` does not replace it. See [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing).

Phase 3 of the distiller already looks for bridges, but only for each new note, by shape ([memory_bridges_by_shape_are_judged_by_reading](memory_bridges_by_shape_are_judged_by_reading)). It does not reach old isolated notes. `tb link` covers the existing corpus. That decision also says: if fewer than half of the bridges hold, bridges go back to the whole-graph curator. This design is that curator, in code.

A near-vector candidate is not a new bridge by itself. Only 26% of the refs point to the top 10 of a vector search ([memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach)). So the LLM judge must not accept a pair only for being near. The judge prompt keeps the rule "when in doubt, it is not connected".

An earlier decision puts whole-graph curation inside the dashboard, run by a `th` member with live streaming ([graph_curation_via_th_agent](graph_curation_via_th_agent)). This design does not replace it. The dashboard run is a manual, watched action. `tb link` is the unattended one on a timer. If both stay, the dashboard can call `tb link` instead of a member that follows the skill text.

Where it can break: the similarity threshold. Too low gives trivial bridges. Too high leaves notes isolated. Fix it after reading the distribution in a dry run, as `refine` does for trust.

## Cross-references

- [memory_bridges_by_shape_are_judged_by_reading](memory_bridges_by_shape_are_judged_by_reading) — phase 3 of the distiller, new notes only
- [memory_refs_carry_non_semantic_reach](memory_refs_carry_non_semantic_reach) — why near is not enough
- [graph_curation_via_th_agent](graph_curation_via_th_agent) — the manual, watched curation in the dashboard
- [memory_distillation_stays_manual_for_now](memory_distillation_stays_manual_for_now) — the distiller that replaces `platone` and `erodoto`
- [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) — the pattern `tb link` copies
