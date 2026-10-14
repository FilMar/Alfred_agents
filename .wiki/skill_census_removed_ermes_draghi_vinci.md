---
tags: [skill, census, removal]
sources: [conversation, .design/main.md]
---

## Decision

Three skills were removed on 2026-10-14, in the census of the skills: `ermes`, `draghi` and `vinci`. `linus` stays. `atlante` stays too, because the analysis needs it (`.design/main.md`).

- `ermes` managed email through Himalaya. `vinci` made a CV in Typst. `draghi` imported bank CSVs into a ledger of spending and computed trends.
- None of the three appeared in the 79 sessions of the last month. The sessions of `pi` (794 exchanges) were not counted.
- The data of `draghi` is not lost. The ledger `.bank.csv` lives in the `essays` repo. The scripts used `xan` for filters and plots, and `uv` for the Python. They are in git: `git log -- skills/draghi`.
- The idea of a skill for Typst documents is dropped. If it is needed, it is thought from zero.

## Why

The user decided to keep only `linus`. A skill nobody uses costs context, because its description loads in every session.

The analysis of the expenses is a use case of the sub-project `analisi`. It will start from the CSV and `xan`, not from the old skill.

## Cross-references

- [skill_census_removed_erodoto_jobs_ulisse](skill_census_removed_erodoto_jobs_ulisse) — the first removals of the census
