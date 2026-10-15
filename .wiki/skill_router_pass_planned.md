---
tags: [skills, router, progressive-disclosure, planned]
sources: [conversation, .wiki/skill_migration.md@b1c408c]
---

## Decision

Next skill pass (decided 2026-08-18, deliberately deferred until the direct-CLI convention has seen real use): each multi-direction skill's `SKILL.md` becomes a small router (~50-60 lines) holding only three things:

1. **Identity + trigger** (frontmatter) — the invariants valid on every run These are the hard behaviour contracts of the skill, plus the `--help` rule. The `--help` of the CLI is the authority on flag syntax, and the skill is the authority on procedure. Read `--help` before trying variants when a command fails. Invariants live only in the router, never copied into branch files.
2. **A dispatch table** `task direction → references/<task>.md`.
3. Nothing else. No procedure content in the router.

Work order when it starts: efesto first (rule-1 rewrite + new lint checks: line cap for router skills, dead-reference check). Then the multi-direction skills: aristotele, platone, linus, indiana, mose. Borderline cases decided in audit.

## Why

Aggressive progressive disclosure: a small router forces procedure detail into `references/` files read on demand, instead of a long `SKILL.md` read in full every run. Two design rules protect it. Dispatch lines are **pointers, not summaries**. A line says when to read the branch file. It never says how to do the task, or the model acts on the summary and skips the file. Skills split **by task direction, not by size**. Single-procedure skills (polo, christopher, ...) stay one file. The ~60-line cap applies only to skills with `references/` branches.

## Cross-references

- [skill_convention_direct_cli](skill_convention_direct_cli) — the convention this pass refines