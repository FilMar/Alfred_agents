---
tags: [memory, tl, episodic, distiller, index]
sources: [.design/memory.md@0e0a366, SPEC.md@6b044c8, REVIEW.md@6b044c8, tools/alfred/src/hist/episodes.rs, tools/alfred/src/hist/mod.rs, tools/alfred/src/distill/session_run.rs, tools/tl/src/episodes.ts@last-typescript, tools/tl/src/episode_store.ts@last-typescript, spikes/2026-10-01-extraction-hats/main.py (deleted), spikes/2026-10-01-extraction-hats/extract_v3.jsonl (deleted), tools/tl/README.md@last-typescript]
---

## Decision

The episodes that phase 0 of the distiller finds become an index of their own: the search over `tl`.

An episode is a run of consecutive exchanges about one problem. Each one has a summary of 20 to 30 words that says how it ended: what turned out true, what was decided, which hypothesis fell. The distiller needs these summaries anyway.

The shape:

- A Qdrant collection next to the rules. The real collection is `tl_episodes__v2moe-768` and `tl_episodes` is its alias, as for the other two (alias rule). The vector is the summary, embedded with the same nomic model. The payload holds `session`, `exchanges[]`, `from`, `to`, `summary`, `extractor`, `model` and `created`. `from` and `to` are the times of the first and the last exchange. `extractor` is the id of the configuration row that made the summary, and that row holds the prompt and the model. `created` is when the summary was made. The point id is made from the SHA-256 of `session:first exchange`. Writing a session replaces all of its episodes.
- `tl` stays the only source of truth. An episode holds pointers to exchanges, never their text.
- The index is derived. It can be dropped and rebuilt from `tl`. A better phase 0 prompt means a full rebuild.
- `alfred hist search "<query>"` returns episodes. `alfred hist episode <id>` opens one, and `alfred hist show` opens an exchange of it.

Phase 0 of the distiller writes it, so the index costs one embedding per episode. It is built before the automatic run: see [memory_episodes_fill_from_the_normal_distill_run](memory_episodes_fill_from_the_normal_distill_run). `tl` owns it: see [memory_episode_index_belongs_to_tl](memory_episode_index_belongs_to_tl).

## Why

`tl` had no search. "What did we do on X last week" had no answer. A summary per episode with a vector fills the hole named in [memory_coala_four_types_map_to_pi](memory_coala_four_types_map_to_pi) at almost no cost.

The summaries hold up. On session `684fbf7a` (38 exchanges), glm-5.3-flash found 9 episodes in one call, and all 9 summaries match the session. One stops early because the split cut the story in two. That is an extraction problem.

`created` is the time of the summary, so a session read weeks later would show today's date. `from` and `to` give the date of the work itself.

They hold project terms such as table names. That is right for an index, because you search it with those names. It was wrong for a note of the old `tb`, so the summaries are not notes. `tl` never distils, so a summary does not go in its tables. It lives beside them, marked with the extractor that made it.

Lost: Hindsight as the engine (it drops the raw text and overlaps `tb`), and a table in the `tl` SQLite with `sqlite-vec` (a second retrieval stack next to Qdrant).

The agent finds episodes with `alfred hist search` when it needs them: see [memory_episodes_are_neither_pruned_nor_injected](memory_episodes_are_neither_pruned_nor_injected).

## Cross-references

- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — what `tl` holds, and why it never distils
- [memory_coala_four_types_map_to_pi](memory_coala_four_types_map_to_pi) — episodic memory is the hole
- [memory_distill_runs_on_the_server_with_row_4](memory_distill_runs_on_the_server_with_row_4) — the distiller this phase 0 belongs to
- [memory_embedding_model_follows_the_corpus_language](memory_embedding_model_follows_the_corpus_language) — the embedding model the index reuses
