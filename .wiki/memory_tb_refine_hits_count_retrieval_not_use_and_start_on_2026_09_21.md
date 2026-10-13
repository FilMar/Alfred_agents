---
tags: [memory, tb, refine, hits, hook]
sources: [conversation, tools/tb/src/notes.ts, tools/tb/src/api.ts, tools/td/src/neighbours.ts, extensions/tb_ti/claude.sh]
---

## Decision

`tb refine` reads the hit counters as they are. It adds no field for distinct hit days and no field for who searched. The cap of 10 on each counter limits the damage.

What counts as a hit, today:

- Every call to `searchNotes` counts one hit on each result. Direct results go to `hits` and `last_hit`. Results that arrive through a ref go to `hits_related` and `last_hit_related`.
- The hook on every prompt counts. So do the searches of the agent and of the skills, and the HTTP API, where `record_hits` is true by default.
- `td` does not count. `neighbours.ts` passes `record_hits: false`.
- `tb browse`, `tb random` and `tb tags` do not count. `--no-hits` turns it off for one search.

What a hit means:

- A hit says the note was retrieved. It does not say the note was used. The hook injects every match above 0.6, and the agent may ignore it.
- A project that works on its own tooling inflates its own notes. A note on `td` gets hits when the talk is about `td`.
- The hook and a search by the agent in one turn give two hits for one use.
- Hit counters exist since 2026-09-21, the first `last_hit` in the data. Zero hits before that date means no measure, not no use.

A distinct-day counter is the first field to add if the cap of 10 proves too weak.

## Why

The data on 2026-10-11 (793 notes) shows the signal is useful and noisy. 201 notes have no hit at all, and about 156 of them were made between May and July. The most hit provisional note, with 14 hits, is about `td`. The signal separates the used notes from the others well enough to start. It does not need a new field before the first dry run shows a real problem.

## Cross-references

- [hook_tb_ti_auto_injection](hook_tb_ti_auto_injection) — the hook that adds most hits
- [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) — how the counters enter `trust`
- [memory_td_phase_2a_only_searches_neighbours_and_leaves_no_hit_so_the_cosine_cut_is_gone](memory_td_phase_2a_only_searches_neighbours_and_leaves_no_hit_so_the_cosine_cut_is_gone) — why `td` records no hits
