---
tags: [memory, distiller, novelty, embedding, measurement]
sources: [conversation, spikes/ (local, not in git)]
---

## Decision

The novelty step of the distiller stays a judgment by the model. No cosine cutoff replaces it, and a cutoff of 0.9 is not used.

A cutoff sits in front of the judge only inside one session: [memory_td_same_session_cutoff_drops_twins](memory_td_same_session_cutoff_drops_twins). Against the whole of `tb`, 0.75 caught 5 of 11 duplicates and no new note on the first 31 candidates, a sample too small to fix a value.

## Why

Measured on 31 candidate notes of the first real batches, against the nearest note in `tb` (the nomic model of `tb`):

| Verdict of the judge | Candidates | Similarity, low to high |
|---|---|---|
| duplicate | 11 | 0.68 to 0.86 |
| ref_only | 6 | 0.65 to 0.75 |
| extends | 5 | 0.65 to 0.80 |
| new | 9 | 0.61 to 0.69 |

- A cutoff of 0.9 caught 0 of 11 duplicates. A real paraphrase scored 0.86 and another 0.75. The same text scores 0.95.
- At 0.70 it caught 9 duplicates, and also 2 notes that extend and 3 references. At 0.65 it dropped 4 of 9 new notes.
- The ranges overlap, so similarity cannot tell a duplicate from an extension.
- The nearest note by vector is not always the one the judge matched. The low end of the duplicates is understated.

Inside one session, the 42 pairs of notes saved in the first batches reached 0.67 at most. Five notes on one theme are different ideas, and a cutoff does not see them.

## Cross-references

- [memory_score_cutoffs_belong_to_the_model](memory_score_cutoffs_belong_to_the_model) — a cutoff belongs to the embedding model
- [memory_td_session_cap_limits_one_session](memory_td_session_cap_limits_one_session) — what is done for the clusters
