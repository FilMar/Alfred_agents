---
tags: [memory, tl, extractions, distiller]
sources: [tools/tl/src/types.ts, tests/tl_extractions.test.ts]
---

## Decision

An `extractions` row may have a blank `quote` only when `dropped_by` starts with `check:`. In every other row the quote is still required.

## Why

The model can give a candidate with an empty quote. The phase 1 checks drop it, and the drop must still be recorded: dropped candidates are the point of `extractions`. Before this change `tl` refused the row, so exactly the candidates the checks catch could not be logged.

A candidate that passes the checks always has a quote that is in the text. So a blank quote outside a check drop is still a bug, and `tl` still refuses it.

## Cross-references

- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — the table
- [memory_td_recorder_follows_one_candidate_through_the_phases_and_writes_once_per_exchange](memory_td_recorder_follows_one_candidate_through_the_phases_and_writes_once_per_exchange) — the recorder that writes these rows
