---
tags: [style, lint, oxlint, typescript, idea, ritchie, dijkstra]
sources: [conversation, package.json, justfile, skills/ritchie/references/principles.md, "https://github.com/dmmulroy/anti-slop"]
---

## Decision

This is an idea, not a rule. Nothing is changed yet.

`pi` may get a TypeScript linter: `oxlint`, plus a `lint` recipe in the justfile. It would start with the anti-slop rules that are cheap and hard to dispute: `no-chained-type-assertions`, `no-widen-then-assert`, `no-module-mocking`, `no-reflect-apply`, `no-reflect-get`, `no-array-filter-map`. The rules would be copied into the repo, as anti-slop asks.

Left out, or only as `warn`: `no-runtime-typeof` and `no-unknown-*` until the boundary rule is settled, `require-readable-spacing` (formatter work), `no-shape-in-symbol-names` (taste).

## Why

The Enforcement section of ritchie's `principles.md` says every principle has a mechanical check. Ritchie and dijkstra both run "the project's linter at its strictest setting". `pi` has `tsc` and `just lint-skills`, which checks SKILL.md files, but no linter for TypeScript. So that step does nothing here today.

`no-module-mocking` costs nothing: `tests/` has no module mocks today. It guards the future.

## Cross-references

- [skill_anti_slop_not_adopted_rules_feed_ritchie](skill_anti_slop_not_adopted_rules_feed_ritchie) — the rule set
- [skill_ritchie_may_parse_external_data_at_boundary](skill_ritchie_may_parse_external_data_at_boundary) — gates the `typeof` and `unknown` rules
