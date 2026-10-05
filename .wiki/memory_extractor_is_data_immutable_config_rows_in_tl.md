---
tags: [memory, distiller, tl, sqlite, config]
sources: [conversation, tools/tl/src/db.ts, spikes/2026-10-01-critic-bench/main.py]
---

## Decision

The extractor is data, not code. `tl` gets two tables.

**`extractor`: one row per version of the extractor.** Rows are immutable. A change is a new row, never an update.

```sql
CREATE TABLE extractor (
  id       INTEGER PRIMARY KEY,
  parent   INTEGER REFERENCES extractor(id),  -- the version it comes from
  why      TEXT NOT NULL,                     -- one line: what changed and why
  active   INTEGER NOT NULL DEFAULT 0,        -- the one that saves to tb and ti
  config   TEXT NOT NULL CHECK (json_valid(config)),
  created  TEXT NOT NULL
);
```

`config` is one JSON document. It is a typed struct in code, written whole and checked when it is written and when it is read. It holds every part of the flow that is content:

- every prompt, model, temperature and hat, per phase;
- the critic role and its questions, each as `{name, text, direction, threshold}`;
- the phase 2 parameters (top k, the cosine for a sure duplicate).

**`extractions`: one row per candidate, kept or dropped.**

- `extractor_id`, `exchange_id`;
- type (note or rule), text, quote;
- the critic's probability for each question;
- the phase 2 verdict, and the saved `tb` or `ti` id when it was saved.

Three links tie the rest to the extractor:

- `exchanges.distilled` holds the id of the extractor that processed the exchange.
- rows of the episode index (`tl_episodes`) carry `extractor_id`.
- saved notes and rules carry `extractor_id`.

A second extractor can run in shadow on the same sessions. It writes only to `extractions` and saves nothing.

The shape of the flow stays code: which phases exist, the checks after extraction, extraction per exchange. A change there is a code change and a new extractor row.

## Why

**A change to the extractor should not need code.** Today's move from critic E to critic F changed one question's text and one threshold. With this table it is a new row.

**Immutable rows keep the history true.** An extraction points to the config that produced it. If rows could change, old extractions would point to a config that did not make them. A new row with `parent` and `why` gives the history git would give. A diff command over two rows (`tl extractor diff`) replaces the git diff. The prompts do not also live in a file in the repo: two sources would drift.

**One JSON column, not one column per field.** A new parameter must not need a migration. SQLite has no JSON type: JSON is TEXT, and the JSON functions only read it. So the struct does the checking. `CHECK (json_valid(config))` only stops broken text.

**Dropped candidates are the point of `extractions`.** With the critic's probabilities stored, thresholds can move over every real candidate without new calls. The critic bench did this on 75 frozen items. Here the bench grows by itself.

**Use becomes the label.** A note that decays unused is a bad label for the extractor that let it pass. A note that is used is a good one. Over time this replaces hand labels. It needs `extractor_id` on every saved note.

**Session data does not fit a row per candidate.** One call to find episodes serves many candidates. The episodes go to `tl_episodes`, which already exists as a plan. Cost per session can be summed from the calls. No third table.

**Where it will likely break.** `tl` stops being a pure archive: it also holds the distiller's register. This is accepted because the distiller already reads the `tl` queue and sets `distilled`.

The schema is written with the real distiller, not with the spike.

## Cross-references

- [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question) — the first config the table would hold
- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — the phases the config describes
- [memory_episode_summaries_are_a_derived_index_over_tl](memory_episode_summaries_are_a_derived_index_over_tl) — the episode index that carries `extractor_id`
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the tables tl has today
- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — use, not reading, judges a note
