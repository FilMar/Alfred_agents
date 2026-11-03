---
tags: [skill, ritchie, idea, boundary, typescript, errors]
sources: [conversation, skills/ritchie/SKILL.md, skills/ritchie/references/principles.md, skills/ritchie/references/rules.md]
---

## Decision

This is an idea, not a rule. Nothing is changed yet.

Ritchie may get one new rule: external data is parsed once, at the boundary, into a precise type. Disk, network, another process and a model answer are external. Inside the boundary, no value is `unknown`, `any` or an open `Record<string, unknown>`, and no `typeof` narrows it. A failed parse is a world error: a return value (P5). After the parse, contracts trust the type (P3).

The rule would live in the Errors group of `SKILL.md`, or in a new Boundaries group.

## Why

Ritchie names the boundary three times and never states this rule. P4 puts verbosity at the edges. The pair assertion checks data that crosses a boundary. `rules.md` keeps "a check on data from disk, network or a model". None of them says where untyped data must stop.

`dmmulroy/anti-slop` enforces the rule in TypeScript. In `tools/` there are 86 `typeof` and 72 `: unknown`. Nobody has checked how many sit away from a boundary. Read them before writing the rule.

## Cross-references

- [skill_anti_slop_not_adopted_rules_feed_ritchie](skill_anti_slop_not_adopted_rules_feed_ritchie) — where the idea comes from
- [memory_td_errors_are_values_or_thrown](memory_td_errors_are_values_or_thrown) — world errors in `td`
