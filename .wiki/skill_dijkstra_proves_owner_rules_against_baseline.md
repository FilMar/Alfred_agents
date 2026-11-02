---
tags: [skill, dijkstra, ritchie, pike, gate]
sources: [skills/dijkstra/SKILL.md]
---

## Decision

Before any cut, dijkstra runs the check of the skill that owns each file and keeps the output: `contract_report.py` for ritchie's files, `check_script.sh` for each pike script. A file with `desc:` and `usage:` headers is pike's. Any other file is ritchie's. After the cuts, the same check must show no finding that the baseline did not have, next to the size gate, the linter and the tests. The baseline must also start green.

## Why

"Keeps the rules of ritchie and pike" is a promise. A check that a tool runs makes it a fact. Comparing with the baseline, and not asking for zero findings, keeps dijkstra from failing on debt it did not create. A red baseline stops the run, because cleaning on red hides what broke.
