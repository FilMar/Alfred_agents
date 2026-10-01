---
tags: [memory, tl, episodic, distiller, index]
sources: [spikes/2026-10-01-extraction-hats/main.py, spikes/2026-10-01-extraction-hats/extract_v3.jsonl, tools/tl/README.md]
---

## Decision

The episodes that phase 0 of the distiller finds become an index of their own. It is the search over `tl`.

Phase 0 splits a session into episodes. An episode is a run of consecutive exchanges about one problem. Each one gets a summary of 20 to 30 words that says how it ended: what turned out true, what was decided, which hypothesis fell. The distiller needs these summaries anyway. The index keeps them.

The shape, a design target with no code yet:

- A Qdrant collection, `tl_episodes`, on the Rasp next to `tb` and `ti`. The vector is the summary, embedded with the same nomic model.
- Payload: `session`, `exchanges[]`, `summary`, `model`, `prompt_version`, `created`.
- `tl` stays the only source of truth. An episode holds pointers to exchanges, never their text.
- The index is derived. It can be dropped and rebuilt from `tl` at any time. A better phase 0 prompt means a full rebuild.
- A command such as `tl search "<query>"` returns episodes. `tl show` opens the exchanges behind them.

It is built after the extraction pipeline is stable. Phase 0 is shared, so the index then costs one embedding per episode.

## Why

`tl` has no search. It is CRUD over three tables. "What did we do on X last week" has no answer today. Episodic memory was already named as the hole in the stack in [memory_coala_four_types_map_to_pi](memory_coala_four_types_map_to_pi). A summary per episode with a vector fills it at almost no cost.

The summaries hold up. On session `684fbf7a` (38 exchanges, 29 after noise), glm-5.3-flash found 9 episodes in one call. All 9 summaries match the session, and their outcomes were checked against the exchanges. One summary stops early because the split cut the story in two. That is an extraction problem, not an index problem: the summary is still true.

The summaries hold project terms (table names, migration names). That is right for an index, because you search it with those names. It is wrong for a `tb` note, which is why the summaries are not notes.

`tl` itself never distils. A summary is a distillation, so it does not go in the `tl` tables as if it were raw data. It lives beside them, marked with the model and prompt that made it. This keeps `tl` honest. It also follows the reason `tl` exists, which is to redo derived work when the tool improves ([memory_raw_text_lives_in_the_archive_not_the_note](memory_raw_text_lives_in_the_archive_not_the_note)).

Alternatives that lost:

- **Hindsight as the engine.** It extracts facts and drops the raw text, and it overlaps `tb`. The parts that matter here are one structured call and code for the rest. They are cheap to build in place.
- **A table in the `tl` SQLite with `sqlite-vec`, or text search only.** Each one is simpler alone. Each one adds a second retrieval stack next to Qdrant.

A later use, not decided here: the session-start hook could query the last episodes of the current project. That is the "initial memory" the Hindsight question started from.

## Cross-references

- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — what `tl` holds, and why it never distils
- [memory_coala_four_types_map_to_pi](memory_coala_four_types_map_to_pi) — episodic memory is the hole
- [memory_distillation_stays_manual_for_now](memory_distillation_stays_manual_for_now) — the distiller this phase 0 belongs to
- [memory_embedding_model_follows_the_corpus_language](memory_embedding_model_follows_the_corpus_language) — the embedding model the index reuses
