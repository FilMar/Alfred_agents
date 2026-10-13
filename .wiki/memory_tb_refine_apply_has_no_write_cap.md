---
tags: [memory, tb, refine, archive]
sources: [tools/tb/SPEC.md@78af67d, tools/tb/REVIEW.md@78af67d, conversation]
---

## Decision

`tb refine --apply` has no cap on writes per run, unlike `td distill --max-saved`.

## Why

It is launched by hand until the switch is on. The archive is reversible: a hit brings the note back. The first wave comes after 2027-01-18.

Add `--max-archived` if a run proves too wide.
