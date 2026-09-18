---
tags: [skills, router, progressive-disclosure, planned]
sources: [conversation, .wiki/skill_migration.md]
---

## Decision

Next skill pass (decided 2026-08-18, deliberately deferred until the direct-CLI convention has seen real use): each multi-direction skill's `SKILL.md` becomes a small router (~50-60 lines) holding only three things:

1. **Identity + trigger** (frontmatter) — the invariants valid on every run (hard behaviour contracts like "ermes never sends", plus the `--help` rule: the CLI's `--help` is the authority on flag syntax, the skill on procedure — read it before trying variants when a command fails). Invariants live only in the router, never copied into branch files.
2. **A dispatch table** `task direction → references/<task>.md`.
3. Nothing else. No procedure content in the router.

Work order when it starts: efesto first (rule-1 rewrite + new lint checks: line cap for router skills, dead-reference check). Then the multi-direction skills: jobs, annibale, fury, aristotele, platone, linus, piano, vinci, indiana, mose. Borderline cases decided in audit.

## Why

Aggressive progressive disclosure: a small router forces procedure detail into `references/` files read on demand, instead of a long `SKILL.md` read in full every run. Two design rules protect it: dispatch lines are **pointers, not summaries** — a line says when to read the branch file, never how to do the task, or the model acts on the summary and skips the file; and skills split **by task direction, not by size** — single-procedure skills (polo, ulisse, christopher, ...) stay one file; the ~60-line cap applies only to skills with `references/` branches.

## Cross-references

- [skill_convention_direct_cli](skill_convention_direct_cli) — the convention this pass refines