---
tags: [skill, external, anti-slop, oxlint, ritchie, typescript, idea]
sources: [conversation, "https://github.com/dmmulroy/anti-slop", skills/ritchie/SKILL.md, skills/ritchie/references/principles.md, skills/ritchie/references/languages/typescript.md]
---

## Decision

`dmmulroy/anti-slop` is not installed as a whole. It is a set of Oxlint rules for TypeScript, plus one skill that copies them into a repo. The rules are the author's taste, by his own words. This is an idea page. Nothing is changed yet.

Half the rules carry a principle that holds in any language:

- external data is parsed once at the boundary (`no-runtime-typeof`, `no-unknown-*`, `no-unsafe-dictionary-type`, `no-known-value-widening`);
- no cast without proof (`no-chained-type-assertions`, `no-widen-then-assert`, `require-safety-comment-for-type-assertion`);
- test through real seams, not module mocks (`no-module-mocking`);
- no dynamic access where static access works (`no-reflect-*`);
- a name says what a thing is, not its form (`no-shape-in-symbol-names`).

The rest is TypeScript only: `no-array-filter-map`, `no-reduce-accumulator-copy`, `no-conditional-empty-object-spread`, `no-object-parameters`, the Effect rules. `require-readable-spacing` is formatter work.

Against ritchie: chained casts and widen-then-assert follow from P3. Shape names follow from "an abstraction must make sense of the domain". Spacing goes to the formatter. Module mocks are covered in spirit by "pure functions behind the edge", not by a ban. Filter-map belongs to dijkstra, if anywhere. The gap and the friction are their own idea pages, linked below.

## Why

Enabling every rule as `error` in `pi` would fire about 200 times on day one: 86 `typeof`, 72 `: unknown`, 64 `as X` in `tools/`. `no-runtime-typeof` also assumes a schema library at the boundary, and `pi` has none. The principles are worth more than the package.

## Cross-references

- [skill_ritchie_may_parse_external_data_at_boundary](skill_ritchie_may_parse_external_data_at_boundary) — the gap
- [skill_ritchie_may_allow_casts_only_after_assert](skill_ritchie_may_allow_casts_only_after_assert) — the friction with P6
- [style_pi_may_lint_typescript_with_oxlint](style_pi_may_lint_typescript_with_oxlint) — the enforcement
