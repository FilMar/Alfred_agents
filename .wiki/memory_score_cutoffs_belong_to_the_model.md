---
tags: [memory, tb, ti, embedding, measurement, hook]
sources: [spikes/2026-09-28-tb-corpus/tb_threshold.py (deleted), spikes/2026-09-28-tb-corpus/reports/fase0_threshold.json (deleted), extensions/tb_ti/claude.sh, skills/christopher/SKILL.md, skills/mose/SKILL.md]
---

## Decision

A `--min-score` value is a property of the embedding model in use, not a preference. It is measured, and measured again when the model changes. Every consumer that passes a cutoff names the model it was measured on.

On `nomic-embed-text-v2-moe`, over the 120-paraphrase set: a right answer scores 0.429 at worst and 0.597 at the median. Three off-topic queries top out at 0.251. The band between 0.25 and 0.43 is empty.

| consumer | was | is | job |
|---|---|---|---|
| `skills/christopher` | 0.6 | 0.35 | deliberate retrieval wants reach; the agent judges |
| `skills/mose` | 0.6 | 0.5 | dedupe wants candidates to compare |
| `extensions/tb_ti/claude.sh` | 0.8 | 0.5 | automatic injection, nobody to judge |

## Why

One number, 0.6, was wrong in two opposite directions. Too high for retrieval, which returned almost nothing. Too low for dedupe on `ti`, where a plainly different rule reaches 0.660 and a verbatim duplicate starts at 0.732. One value could do both jobs only while every score sat near 0.7 and none of them meant anything.

The hook is the sharper lesson. At 0.8 it fired on none of eight real prompts, and under v1.5 it fired on none either. The automatic injection was silent from the start. That is most of the reason 545 of 747 notes were never hit: they were never offered. A cutoff nobody measured turned a feature off and left no error.

The knee of the precision curve is at 0.65: the right note is first for 95.5% of the queries that pass, but only 18% of queries pass. The hook sits below the knee on purpose. A prompt is longer and less focused than a test query, so it scores lower, and a hook that never speaks is worth less than one that is sometimes redundant.

Rejected: keep 0.8 and call the behaviour unchanged. It is unchanged in the sense that it stays broken.

## Cross-references

- [The embedding model follows the corpus language](memory_embedding_model_follows_the_corpus_language)
- [tb and ti inject automatically through a hook](hook_tb_ti_auto_injection)
- [Related notes are ranked, not cut](memory_related_notes_ranked_not_cut) — a cutoff cannot
  filter what arrives with no score. The hook still injects unscored related notes.
