---
tags: [memory, distiller, td, tl, session]
sources: [tools/td/SPEC_ACTIVE.md@61d5a9f, tools/td/src/distiller.ts, tools/td/src/save.ts, tools/td/src/session.ts]
---

## Decision

A session is the unit of `distilled`.

- `distilled` is set once, at the end of the session. It goes on every pending exchange the run read: the kept turns and the noise.
- The value is the run time, an ISO-8601 UTC string.
- The session closes only when nothing failed: the split, every extraction, every critic call, every novelty call and every save. A hit on the `--max-saved` cap also counts as a failure.
- With any failure, nothing closes. The next run takes the whole session again.
- `td distill` with no argument takes every session that has pending exchanges, one after the other. `td distill <session>` takes one.

`tl` checks that `distilled` is a time, so an extractor id cannot be stored there.

## Why

A split into episodes is not deterministic, and the episodes are not saved. A run that stops in the middle and starts again gets a different map. Closing exchange by exchange would leave half a session closed under a map that no longer exists. A whole session is the smallest piece that can be redone.

Redoing is cheap and safe. Phase 2b sees what `tb` and `ti` already hold, so an item saved by the failed run comes back as `duplicate`. In the first live run, the second pass over one session gave 8 duplicates out of 16 judged items and wrote only 5 items.

Noise is closed too. A task notification is read and dropped by phase 0. If it stayed pending, it would sit in the queue for ever.

Taking every pending session is what makes active mode empty the queue. In shadow mode the queue never shrinks.

## Cross-references

- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — the table whose last row this changes
- [memory_distiller_distills_chat_only](memory_distiller_distills_chat_only) — what counts as noise
- [memory_td_max_saved_caps_the_writes_of_one_run_and_a_capped_session_stays_pending](memory_td_max_saved_caps_the_writes_of_one_run_and_a_capped_session_stays_pending) — the cap, a failure that keeps a session open
