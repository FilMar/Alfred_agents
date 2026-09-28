---
tags: [memory, tb, ti, embedding, measurement, hook]
sources: [scripts/tb_threshold.py, scripts/reports/fase0_threshold.json, extensions/tb_ti/claude.sh, skills/christopher/SKILL.md, skills/mose/SKILL.md]
---

## Decision

A `--min-score` value is a property of the embedding model in use, not a preference.
It is measured, and it is re-measured when the model changes. Every consumer that
passes a cutoff names the model it was measured on.

Measured on `nomic-embed-text-v2-moe`, over the 120-paraphrase set: a right answer
scores 0.429 at worst and 0.597 at the median. Three off-topic queries top out at
0.251. The band between 0.25 and 0.43 is empty.

The cutoffs that follow from that:

| consumer | was | is | job |
|---|---|---|---|
| `skills/christopher` | 0.6 | 0.35 | deliberate retrieval wants reach; the agent judges what came back |
| `skills/mose` | 0.6 | 0.5 | dedupe wants candidates to compare, not a verdict |
| `extensions/tb_ti/claude.sh` | 0.8 | 0.5 | automatic injection, no one to judge it |

## Why

One number, 0.6, was wrong in two opposite directions at once. It was too high for
retrieval, which returned almost nothing. It was too low for dedupe on `ti`, where a
plainly different rule reaches 0.660 and a verbatim duplicate starts at 0.732. The
same value could do both jobs only while every score sat near 0.7 and none of them
meant anything.

The hook is the sharper lesson. At 0.8 it fired on none of eight real prompts — and it
fired on none of them under v1.5 either. The automatic injection has been silent from
the start. That is most of the reason 545 notes of 747 have never been hit: the notes
were never offered, so they could not be used. A cutoff nobody measured turned a
feature off and left no error behind.

The full precision curve is in `scripts/reports/fase0_threshold.json`. Its knee is at
0.65, where the right note is first for 95.5% of the queries that pass, but only 18%
of queries pass. The hook sits below the knee on purpose: a prompt is longer and less
focused than a test query, so it scores lower, and a hook that never speaks is worth
less than one that is sometimes redundant.

The rejected alternative was to keep 0.8 and call the behaviour unchanged. It is
unchanged in the sense that it stays broken.

## Cross-references

- [The embedding model follows the corpus language](memory_embedding_model_follows_the_corpus_language)
- [tb and ti inject automatically through a hook](hook_tb_ti_auto_injection)
- [Related notes are ranked, not cut](memory_related_notes_ranked_not_cut) — a cutoff cannot
  filter what arrives with no score. The hook still injects unscored related notes.
