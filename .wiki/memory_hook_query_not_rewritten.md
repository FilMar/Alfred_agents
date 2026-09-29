---
tags: [memory, hook, tb, ti, query]
sources: [conversation, spikes/2026-09-29-query-rewrite/main.py]
---

## Decision

The hook sends the user's prompt to `tb` and `ti` as it is. It does not rewrite it with a small model first. Reopen only if use shows prompts that find nothing.

## Why

Measured on 60 paraphrases of notes, each buried in the middle of a real 40-150 word prompt from `tl` (167 available), with a 9B model at bazzite as the rewriter:

| query | recall@10 |
|---|---|
| the buried prompt as it is | 0.283 |
| rewritten by the 9B | 0.233 |
| the clean paraphrase alone | 0.883 |

The rewrite lost 0.05 where the plan needed a gain of 0.10. Latency was not the problem: 0.7 s median. The rewriter kept the dominant topic of the message, which was the noise. A model that reads only the prompt cannot know which sentence the notes are about.

Most prompts leave nothing to rewrite. Of 1,767 chat prompts in `tl`, 55% have 15 words or fewer and 27% have 5 or fewer ("procedi"). Only 18% have 40 or more.

## Limit of the measure

The test buries an unrelated topic, so it cannot show a rewrite that narrows a prompt that is coherent from start to end. No real prompt is labelled with the note it should find, and building that set costs more than the feature is worth today. The verdict is "not proven", and the cost of being wrong is one hook that keeps working as it does.

## Cross-references

- [memory_score_cutoffs_belong_to_the_model](memory_score_cutoffs_belong_to_the_model) — the 0.5 cutoff that already makes the hook fire on the right prompt
- [memory_embedding_model_follows_the_corpus_language](memory_embedding_model_follows_the_corpus_language) — where recall@1 0.650 on clean queries comes from
