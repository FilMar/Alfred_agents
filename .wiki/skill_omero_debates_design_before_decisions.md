---
tags: [skill, omero, piano, roadmap]
sources: [conversation]
---

## Decision

Work moves in three steps, each with one question and one output:

1. `piano`: what for. Output: `.design/`.
2. `omero`: how, and in what blocks. Output: decisions and roadmap blocks in `.wiki/`.
3. `edison` and `ritchie`: do it. Output: code.

Step 2 is `Ingest`, with a wider source. It takes `.design/` like any other material, reads the live wiki and the code, debates with the user, and proposes decisions and roadmap blocks. `.design/` is read only. It writes only after the user agrees. A block is sized by its complexity: see the Roadmap entry in `references/GLOSSARY.md`.

This runs at the init of a wiki, and again for every new feature. It adds only new blocks to the roadmap. Rewriting an existing roadmap is a separate job with the user.

Open: tasks that are not blocks (manual work, waiting on a date).

## Why

A new feature used to start as code, and nobody asked how it fits the others. Now the functional question comes first, where it costs less.

A use-case file holds needs, not technical choices, so there is nothing to extract. Someone must propose options and the user must choose. This is `Ingest` with a source that does not decide. A decision records what the source says or what the user chose, and `omero` asks where the source is silent. The user's ok before writing is the gate that stops it from inventing. One flow, not two: the only difference is how much the source decides.

A spike by `edison` may break a technical decision. Then the decision is edited in place, under the usual rules.

## Cross-references

- [skill_piano_writes_design_main_md](skill_piano_writes_design_main_md) — the step before
