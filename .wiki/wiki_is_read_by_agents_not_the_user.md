---
tags: [wiki, design, process, omero]
sources: [conversation, .design/main.md]
---

## Decision

Each document has one reader.

- `.design/` is for the user. It is minimal, in Italian, and read often.
- `SPEC.md` and `REVIEW.md` are for the user, once. The user reads them, approves, and they are thrown away.
- `.wiki/` is for the agents. It holds the why of a decision, in plain English.

The user does not read the wiki. The effort goes into what an agent needs: pages of 40 lines, names that `grep` finds, and index rows that say what is inside. `scripts/lint_wiki.py` checks them.

## Why

In the saved sessions of this project, 23 of 28 touched `.wiki/`: 455 reads and 96 writes. The count includes the sessions that maintained the wiki, so it is an upper bound. A store read five times for each write is used, even if no person reads it.

Plain English is a brake on the writer, not a courtesy for the reader. An agent left free writes the longest and most complex text, to show its value. Short sentences (30 words at most) and short pages (40 lines) stop that, and the script counts both.

The design is easy to read because it is small. A spec or a review is made to be read once. The wiki is the one place that grows without a human limit of attention, so it gets mechanical limits.

## Cross-references

- [wiki_edit_in_place_delete_superseded](wiki_edit_in_place_delete_superseded) — the rules of change for the same pages
- [skill_omero_debates_design_before_decisions](skill_omero_debates_design_before_decisions) — how `.design/` becomes decisions
