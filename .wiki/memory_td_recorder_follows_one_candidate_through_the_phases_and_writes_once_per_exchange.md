---
tags: [memory, distiller, td, recorder, extractions]
sources: [tools/td/src/recorder.ts, tests/td_recorder.test.ts, tools/tl/src/types.ts]
---

## Decision

Component 12 is two classes in `tools/td/src/recorder.ts`.

- `Outcome` is one candidate on its way through the phases. It is immutable, and each phase returns a new value: `ofNote` or `ofRule` from a `Checked` (phase 1), `judged` (critic, 1b), `nearIdentical` (2a), `decided` (2b), `saved` (2c). A wrong move is a broken contract: a dropped candidate cannot be judged, decided or saved, and each step happens once.
- `Recorder` is one run of one extractor. It holds the extractor id and the run. `rows` is pure: it turns the outcomes of one exchange into `extractions` rows. `write` calls `putExtractions` from the `tl` client.

Choices:

- The run is the ISO-8601 UTC time when `td distill` starts. The index is `(extractor_id, run)`, so no uuid is needed.
- The verdict is a non-blank string for now. Component 10 (novelty) will own the list of verdicts.
- The Distiller writes once per exchange, not once per session. A crash keeps the rows written so far.
- No writer is injected. There is one backend, so the recorder imports the `tl` client directly.

## Why

The rules of an `extractions` row already live in `tl`: a dropped candidate has no verdict, a check drop has no probabilities, a saved candidate has a verdict. `Outcome` makes the same rules hold while the row is built, at the phase that breaks them, not at write time. `toRow` checks the row with the `tl` validator and reads it back as the same outcome. So a field put in the wrong column breaks a contract.

Row building is pure so it can be tested without `tl`. `write` is a thin edge and is tested against an in-memory `tl` server.

Seven mutants were caught: a lost `check:` prefix, an ignored critic drop, verdict and `of` swapped, empty probabilities accepted, `created` taken from the run, lost probabilities, a lost saved id.

## Cross-references

- [memory_distiller_td_is_fourteen_components_behind_one_entry_point](memory_distiller_td_is_fourteen_components_behind_one_entry_point) — component 12 in the list
- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — the `extractions` table
- [memory_tl_extraction_quote_may_be_blank_only_when_a_check_dropped_it](memory_tl_extraction_quote_may_be_blank_only_when_a_check_dropped_it) — the one `tl` rule changed for the recorder
