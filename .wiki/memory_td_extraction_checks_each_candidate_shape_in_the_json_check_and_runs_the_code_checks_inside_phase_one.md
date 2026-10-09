---
tags: [memory, distiller, td, extraction, phase-1]
sources: [tools/td/src/extraction.ts, spikes/2026-10-01-extraction-hats/main.py]
---

## Decision

Component 6 of `td` is `extraction.ts`, phase 1 for one target turn. It is the first file in the plain style: `Readonly` types and functions, no class.

- `Target` is the map, the episode and the index of the turn inside the episode. `targetOf` checks that the episode is in the map and the index is a turn of it.
- `episodeText` and `targetText` write the two texts of the spike, the episode with the target marked and the target alone. The critic (8) uses the same two.
- `extractionPrompt` is the spike's `user1`, word for word.
- `candidatesCheck` is the `JsonCheck`. It wants `notes` and `rules` as lists, and each item in the shape of `NoteCandidate.fromModel` or `RuleCandidate.fromModel`. The error names the first bad index.
- `checkCandidates` runs the code checks of component 7. The evidence is the cut target text, the whole user input, the project terms of the whole episode, and the vocabulary. Then it runs the rule dedupe.
- `extractFrom` makes the call and returns `{ answer, notes, rules }`. A failed answer has no candidate.
- `loadVocabulary(size)` imports `listTags` from `tools/tb/src/qdrant.ts`: the `size` most used tags.

## Why

**The shape check is stricter than the spike.** The spike only wanted two lists. An item with a wrong shape cannot become an `Outcome` in the recorder, so it would be lost without a trace. Sent back once as an error, the model fixes it.

**The code checks run inside phase 1.** The spike ran them right after the call. Here the `Distiller` gets candidates already kept or dropped, and stays small.

**`tb` as a module, not over HTTP or the CLI.** `td` lives in the same repo. The import costs nothing, but `td` must run where Qdrant is reachable. The same choice can serve the neighbour search of component 9.

## Cross-references

- [skill_ritchie_typescript_values_are_readonly_types_with_contracted_functions_not_classes](skill_ritchie_typescript_values_are_readonly_types_with_contracted_functions_not_classes) — the plain style
- [memory_td_candidates_keep_known_tags_and_propose_new_ones](memory_td_candidates_keep_known_tags_and_propose_new_ones) — the tag checks
- [memory_td_episodes_split_a_session_in_one_call_checked_for_full_cover_and_listed_as_json_strings](memory_td_episodes_split_a_session_in_one_call_checked_for_full_cover_and_listed_as_json_strings) — the map and the episodes
- [memory_tb_clients_read_their_url_per_call_and_ti_tests_restore_their_spies](memory_tb_clients_read_their_url_per_call_and_ti_tests_restore_their_spies) — how the tests reach a fake Qdrant
