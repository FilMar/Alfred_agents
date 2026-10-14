---
tags: [skill, omero, piano, roadmap]
sources: [conversation]
---

## Decision

Work moves in three steps, each with one question and one output:

1. `piano`: what for. Output: `.design/`.
2. `omero`: how, and in what blocks. Output: decisions and roadmap blocks in `.wiki/`.
3. `edison` and `ritchie`: do it. Output: code.

`omero` gets a fifth operation for step 2. It reads `.design/` and the live wiki, debates with the user, and proposes decisions and roadmap blocks. It writes only after the user agrees. A block is sized by its complexity: see the Roadmap entry in `references/GLOSSARY.md`.

This runs at the init of a wiki, and again for every new feature.

Not built yet. Open: how the roadmap is produced in agreement with the user.

## Why

A new feature used to start as code, and nobody asked how it fits the others. Now the functional question comes first, where it costs less.

It is not `Ingest`. A use-case file holds needs, not technical choices, so there is nothing to extract. Someone must propose options and the user must choose. If this lived in `Ingest`, `omero` would invent decisions. The operation is a debate, and its one difference from `Ingest` is that it writes only after the user agrees.

A spike by `edison` may break a technical decision. Then the decision is edited in place, under the usual rules.

## Cross-references

- [skill_piano_writes_design_main_md](skill_piano_writes_design_main_md) — the step before
