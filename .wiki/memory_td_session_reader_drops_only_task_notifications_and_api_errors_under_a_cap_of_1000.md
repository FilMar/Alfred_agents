---
tags: [memory, distiller, td, session, noise, tl]
sources: [tools/td/src/session.ts, tools/tl/src/db.ts]
---

## Decision

Component 3 of `td` (phase 0) is two classes in `session.ts`.

- `Turn` is one exchange with its text. `noise()` is a pure classifier, and the first match wins:
  1. `meta.trigger` is `task-notification`, so the result is `"task-notification"`.
  2. The output starts with `API Error:` after leading whitespace, so the result is `"harness-error"`.
  3. Anything else is `null`.
- `SessionRead.read(session)` reads the pending exchanges of one session and their contents. `SessionRead.of(session, turns)` is the pure part: it sorts by time, then by id, and splits the turns into `turns()` and `noise()`.

Noise is set apart, not thrown away. In active mode every exchange read gets `distilled`, noise too.

`read` asks `tl` for at most `PENDING_CAP` = 1000 rows. When 1000 come back, the session may be cut, so a contract stops the read.

## Why

**Data from all 2569 exchanges of `tl` on 2026-10-09.**

| case | count | noise? |
|---|---|---|
| `trigger = task-notification` | 108 | yes |
| output starts with `API Error:` | 3 | yes |
| input is only a consent ("vai", "procedi", "sì") | 132 | no |
| `tokens_out = 0` | 201 | no |
| output `[Request interrupted by user]` | 27 | no |

**A consent is not noise.** [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) lists "ack" as noise. This decision wins on that point. After a "vai" the work happens, so the output holds it: median 744 characters, and 85 of 132 over 500. Only the user side is empty. A turn that is empty on both sides is dropped by the checks and the critic, with no word list to keep up.

**Neither is an interrupted or empty answer.** The input is there, and it is often the correction that stopped the turn.

**An API error is noise.** The model never answered, and the request usually comes again in the next exchange.

**Subtasks stay.** They are work done in the session.

**The cap.** `listExchanges` in `tl` has a default limit of 100 and cuts the rest with no sign. Three sessions already pass 100. The longest has 210, the p99 is 122. 1000 is about five times the longest. If it ever fires, that says something true: the session needs a look.

**`noise()` holds turns, not `{id, reason}`.** The reason is `turn.noise()`. A second plain shape would be a struct with public fields.

**Where it will likely break.** `#turn` reads the contents one at a time. A session near the cap makes 999 calls. It is fine on a local `tl`, and slow over the network to the Rasp. A batch read of contents in `tl` is the fix, when it hurts.

## Cross-references

- [memory_distiller_td_is_fourteen_components_behind_one_entry_point](memory_distiller_td_is_fourteen_components_behind_one_entry_point) — component 3
- [memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first](memory_extractor_pipeline_is_v7_with_critic_f_built_in_shadow_first) — phase 0, and the ack it listed
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — the rows it reads
