---
tags: [skill, ritchie, spec, review, lifecycle]
sources: [conversation, skills/ritchie/SKILL.md]
---

## Decision

`SPEC.md` and `REVIEW.md` are scaffolding, not artifacts. They are
committed with the branch during the run. On approval, with a project
`.wiki/`, omero files the decision as a wiki page and the pair is
removed from the tree; git keeps the raw text in the branch history.
Without a `.wiki/` the pair stays: it is the only record.

## Why

Keeping every pair next to its module means, over time, more markdown
than code in the tree. The tree stays code.

Nothing durable is lost. The permanent record is the wiki page: the
why, in English, immutable, linked from the roadmap task it closes.
The raw pair stays in git history for the rare case it is needed. The
lesson that survives the project goes to tb, via platone, with the page
path as its source.

The wiki page is written after the design settles, and the pair fills
the gap before that moment. The pair is provisional by nature — the
review walks through rounds — and the wiki holds no provisional pages.

A wiki `sources` field may point at a deleted pair. The same question
is already open for spike files (roadmap: "Spike files are deleted.
Old decisions still list them as sources."). Sources are provenance,
not live links: whatever marker settles that item covers the pair too.

## Cross-references

- [The wiki is the project notebook](memory_wiki_is_the_project_notebook) — the extraction test, and where the distilled why lives
- [A decision is written when the design ends](wiki_decision_is_written_when_the_design_ends) — the pair exists while the shape still moves
- [The spec is a minimal Italian document](skill_ritchie_spec_is_a_minimal_italian_document)
- [The review is the verdict packet](skill_ritchie_review_is_the_verdict_packet)