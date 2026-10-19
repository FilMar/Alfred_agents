---
tags: [memory, distiller, td, novelty, bug]
sources: [SPEC.md@0deaad0, REVIEW.md@0deaad0, tools/td/src/novelty.ts]
---

## Decision

A verdict that links a candidate to a known item is valid only if the item is of the same kind. A note links to a note, and a rule links to a rule. If the judge points at an item of the other kind, `settle` turns the verdict into `new`. It has no link and no `adds`, `reason` or `do`.

This holds for `duplicate`, `extends`, `contradicts`, `ref_only` and `append`.

## Why

The list of known items that the judge sees mixes notes and rules. In the batch of 2026-10-17, the judge said that a note contradicts a rule. The code then tried to link the note to the id of the rule in `tb`, where it does not exist. The note was saved, the link failed, and the session stayed open with 9 items saved and no exchange closed.

A note cannot contradict a rule, and a rule cannot be appended to a note. Saving the candidate as a new item is the answer that loses nothing.

The session is no longer left open for this reason.

## Cross-references

- [memory_td_same_session_cutoff_drops_twins](memory_td_same_session_cutoff_drops_twins) — the other check made on the verdicts of one session
