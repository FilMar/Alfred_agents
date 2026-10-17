---
tags: [memory, distiller, td, cap]
sources: [SPEC.md@e152ae3, REVIEW.md@e152ae3, tools/td/src/cap.ts, tools/td/src/distiller.ts, conversation]
---

## Decision

`td distill --max-per-session <n>` caps the items one session decides. The default is 10. It is a maximum and not a target: a session with fewer ideas saves fewer.

- It counts new notes, notes that extend or contradict, and new rules. A rule appended to another, a reference and a duplicate do not count.
- When the session has decided `n` items, the exchanges that remain go to no model. They have no extraction, no critic and no novelty call.
- In the exchange where the cap is reached, the candidates over it keep their verdict. They are not saved and not added to the session list.
- The session closes. This differs from `--max-saved`, where a capped session stays pending.
- It works in shadow too, so a shadow run shows what the active run would do.
- The library has no cap unless it is passed one. The CLI passes 10.

The first `n` items are kept, in the order of the exchanges. The best `n` are not chosen. Skipped exchanges leave no row in `tl extractions`.

## Why

The first real batch, 5 sessions and 62 exchanges, saved 21 items: 1, 1, 0, 7 and 12 per session. The session with 12 held five notes on one theme, when to generalize and what.

A cap of 4 was tried on paper and rejected: it would cut three of the five sessions, and good ideas with them. A cap of 10 cuts only the extreme one.

A cap does not stop a cluster of near notes. The five notes of that theme were 0.57 to 0.67 close to each other, so no similarity cutoff finds them either: [memory_novelty_stays_with_the_judge_not_a_vector_cutoff](memory_novelty_stays_with_the_judge_not_a_vector_cutoff). The cap saves model calls and bounds a generous session.

Choosing the best `n` would need all the extractions first, and the saving would be gone.

## Cross-references

- [memory_td_max_saved_caps_the_writes_of_one_run_and_a_capped_session_stays_pending](memory_td_max_saved_caps_the_writes_of_one_run_and_a_capped_session_stays_pending) — the cap of the whole run
