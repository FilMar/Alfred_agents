---
tags: [memory, distiller, td, novelty, embedding]
sources: [SPEC.md@0deaad0, REVIEW.md@0deaad0, tools/td/src/twin.ts, tools/td/src/twin_gate.ts, conversation]
---

## Decision

`td distill --same-session-cutoff <x>` drops a candidate that says again what the session has already decided to keep. The default of the CLI is 0.75. The library does not filter unless it is given a value.

- It runs before the novelty judge. The candidate is compared with the items the session decided to save in this run, of the same kind. The measure is the cosine of the texts, with the embedding model of `tb` and `ti`, which runs on the local machine.
- The text is the `what` of a note, and `SE ... ALLORA ...` for a rule. It is the text the judge sees for the items of the session.
- At or above `x`, the candidate takes the verdict `duplicate` of the nearest item, and the first one on a tie. The judge is not asked. If every candidate of an exchange is a twin, no call is made.
- A twin does not enter the list of the session, so it takes no place of the cap.
- It works in shadow.
- It does not compare the candidates of one exchange with each other, and it does not compare with `tb`. That stays the work of the judge.

## Why

In the batch of 2026-10-17, one session of 28 exchanges saved four notes on one idea: a model uses the easiest tool even when written rules say otherwise. They were 0.73 to 0.84 close to each other. The judge called each of them `extends`. The other 51 pairs of notes inside a session were 0.68 or less. So inside a session there is a gap between a paraphrase and a different idea.

Against the whole of `tb` there is no such gap: [memory_novelty_stays_with_the_judge_not_a_vector_cutoff](memory_novelty_stays_with_the_judge_not_a_vector_cutoff). Notes of one conversation are written from the same text, and a paraphrase there is a twin.

The first default was 0.8, a careful value: on that batch it catches 2 of the 6 pairs of the cluster (0.84 and 0.80) and leaves 4 (0.73 to 0.77). A cutoff of 0.72 catches all 6 and no pair of another idea. The sample is one session.

On the next batch, 100 items in 27 sessions, no pair stayed above 0.8, and 6 pairs stayed between 0.70 and 0.80. Two said the same thing in other words. The default went to 0.75. `td distill` prints `twins` for each exchange, so the effect can be counted.

Clusters of different ideas on one theme, 0.57 to 0.67 close, are not twins and this filter does not see them.

## Cross-references

- [memory_td_session_cap_limits_one_session](memory_td_session_cap_limits_one_session) — the cap, and the clusters it does not stop
