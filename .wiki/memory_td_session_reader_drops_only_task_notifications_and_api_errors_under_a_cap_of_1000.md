---
tags: [memory, distiller, td, session, noise, tl]
sources: [tools/td/src/session.ts, tools/tl/src/db.ts]
---

## Decision

Phase 0 of `td` is two classes in `session.ts`. `Turn.noise()` is a pure classifier, and the first match wins: `meta.trigger` is `task-notification`, or the output starts with `API Error:` after leading whitespace, or it is not noise. `SessionRead.read(session)` reads the pending exchanges of one session with their contents. `SessionRead.of` is the pure part: it sorts by time, then by id, and splits the turns into `turns()` and `noise()`.

Noise is set apart, not thrown away. In active mode every exchange read gets `distilled`, noise too.

`read` asks `tl` for at most `PENDING_CAP` = 1000 rows. If 1000 come back, the session may be cut, so a contract stops the read.

## Why

Data from the 2569 exchanges of `tl` on 2026-10-09. Noise: 108 task notifications and 3 API errors. Not noise: 132 consents ("vai", "procedi"), 201 with `tokens_out = 0`, 27 interrupted.

**A consent is not noise.** After a "vai" the work happens, and the output holds it: median 744 characters, and 85 of 132 over 500. Only the user side is empty. A turn empty on both sides is dropped by the checks and the critic, with no word list to keep up.

**An interrupted or empty answer is not noise.** The input is there, and it is often the correction that stopped the turn.

**An API error is noise.** The model never answered, and the request usually comes again in the next exchange.

**Subtasks stay.** They are work done in the session.

**The cap.** `listExchanges` in `tl` has a default limit of 100 and cuts the rest with no sign. Three sessions pass 100, and the longest has 210. 1000 is about five times the longest. If it fires, the session needs a look.

Where it will likely break: `#turn` reads the contents one at a time. A session near the cap makes 999 calls. That is fine on a local `tl` and slow to the Rasp. A batch read in `tl` is the fix, when it hurts.

## Cross-references

- [memory_distiller_td_is_fourteen_components_behind_one_entry_point](memory_td_is_its_own_tool) — component 3
- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — phase 0, and the ack it listed
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the rows it reads
