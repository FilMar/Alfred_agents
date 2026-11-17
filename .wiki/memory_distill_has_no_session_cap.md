---
tags: [memory, distiller, alfred, cap]
sources: [spec.json@6af63cb, tools/alfred/src/distill/save.rs]
---

## Decision

The Rust distiller has no cap for one session. Only the `Budget` of the run caps the writes. `SessionList` takes every rule the session keeps.

## Why

The roadmap block of C1 named only the budget. The cap for one session of `td` (10 by default) was made for clusters of notes on one theme. It can come back if those clusters show up in the rules.

## Cross-references

- [memory_td_max_saved_caps_the_writes_of_one_run_and_a_capped_session_stays_pending](memory_td_max_saved_caps_the_writes_of_one_run_and_a_capped_session_stays_pending) — the budget that stays
