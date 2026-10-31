---
tags: [skill, dijkstra, cleanup, size]
sources: [conversation, skills/dijkstra/SKILL.md, skills/dijkstra/scripts/size_gate.sh]
---

## Decision

Dijkstra cleans code after ritchie or pike, and the net line change is never positive. `size_gate.sh` compares the working tree with a ref over the scope paths, and counts new text files too. The definition of a macro, a generic or a table counts in the total. Work that would add code (a missing test, a missing check) goes into the report as a flag for ritchie or pike. Dijkstra proposes a list first and applies it after the user's ok.

## Why

The user prefers code that is short and dense, even if a little complex, to long code that is easier to read. A cleaner that may add lines drifts into a rewriter. A hard gate keeps it a cleaner.

New files count, because a cut that moves code into a new file would otherwise look free. Binary files are skipped: the first gate counted `__pycache__` as new lines.

The name and the mode were the user's choice: Dijkstra ("lines of code spent, not produced"), and report then apply, so the user picks which cuts land.

## Cross-references

- [Owner rules are proved against a baseline](skill_dijkstra_proves_owner_rules_against_baseline)
