---
tags: [wiki, meta, structure, omero]
sources: [skills/omero/SKILL.md, .wiki/log.md]
---

## Decision

This wiki moved (2026-09-18) from mutable pages plus a log to **immutable decision-chain files**:

- One decision per file, named `<topic>_<slug>.md` (lowercase, underscore). The topic is the shared prefix; `Glob .wiki/<topic>_*.md` lists every decision on it.
- A decision file is never edited once written. A change of course is a new file with `replaces:` naming the old one; a decision is **live** when no other decision names it in `replaces`. Superseded decisions stay on disk and drop out of `index.md`.
- Structure: real YAML frontmatter (`tags`, `sources`, `replaces`), then `## Decision`, `## Why`, `## Cross-references`.
- The wiki records the **why**; the code is the **what**. A design target with no code yet is the one case where the decision is also the state.
- Special pages, mutable: `index` (catalogue of live decisions) and `roadmap` (future task list). **There is no log: git history is the log.**
- Rejected alternatives fold into `## Why` — they do not get their own file.

The migration: every old page (multi-decision pages like `architettura.md`, the reference pages, the whole `log.md`) was split into the decision files this index catalogues; the old pages were deleted, their content preserved here and in git history.

## Why

The page-plus-log model kept two copies of every fact: the page restated current state, the log restated the change. Both drifted, and the log became the only place recording *why* a choice was made. Decision files keep one fact in one place with its reason attached, and the `replaces` chain plus git history replace the log entirely — removing exactly the accounting work that made old wikis rot. The old model's own log admitted the problem: pages needed constant reconcile passes to stay coherent.

## Cross-references

- [agents_roster_lives_on_filesystem](agents_roster_lives_on_filesystem) — the same source-of-truth instinct, applied to the roster
- [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) — a cautionary tale about untracked destructive edits