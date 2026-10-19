---
tags: [skill, census, removal]
sources: [conversation, .design/main.md]
replaces: [skill_census_removed_ermes_draghi_vinci@4ed22aa]
---

## Decision

Four skills were removed on 2026-10-14, in the census of the skills: `ermes`, `draghi`, `vinci` and `atlante`. Only `linus` stays among the ones that were judged.

- `ermes` managed email through Himalaya. `vinci` made a CV in Typst. `draghi` imported bank CSVs into a ledger of spending and computed trends. `atlante` turned data into an interactive HTML chart with D3.
- None of the four appeared in the 79 sessions of the last month. The sessions of `pi` (794 exchanges) were not counted. The user says `atlante` is used little or never.
- The data of `draghi` is not lost. The ledger `.bank.csv` lives in the `essays` repo. The scripts used `xan` for filters and plots, and `uv` for the Python. All four skills are in git: `git log -- skills/<name>`.
- The idea of a skill for Typst documents is dropped. If it is needed, it is thought from zero.

## Why

The user decided to keep only `linus`. A skill nobody uses costs context, because its description loads in every session.

The analysis of data and facts is a sub-project of `.design/main.md`, still to discuss. It will start from the need and from `xan`, not from the old skills. Nothing draws charts until then.

## Cross-references

- [skill_census_removed_erodoto_jobs_ulisse](skill_census_removed_erodoto_jobs_ulisse) — the first removals of the census
