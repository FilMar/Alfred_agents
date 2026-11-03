---
tags: [skill, ritchie, idea, typescript, casts, comments]
sources: [conversation, skills/ritchie/references/principles.md, skills/ritchie/references/languages/typescript.md]
---

## Decision

This is an idea, not a rule. Nothing is changed yet.

The TypeScript sheet of ritchie may get one line: an `as X` appears only in the function that builds `X`, right after an assert that proves the cast. `sessionMapOf()` in the sheet already does this: it asserts the cover, then returns `{ episodes } as SessionMap`.

## Why

`require-safety-comment-for-type-assertion` in `dmmulroy/anti-slop` asks for a `// SAFETY:` comment next to each cast. That clashes with P6: zero comments, and an assert where a comment would go. A comment that justifies a cast is exactly what P6 replaces. An assert cannot go stale without failing. A comment can.

So the anti-slop rule is not adopted. The ritchie form is. A lint for it is welcome if one exists. If none does, review checks it.

## Cross-references

- [skill_anti_slop_not_adopted_rules_feed_ritchie](skill_anti_slop_not_adopted_rules_feed_ritchie) — where the idea comes from
- [skill_ritchie_typescript_values_are_readonly_types_with_contracted_functions_not_classes](skill_ritchie_typescript_values_are_readonly_types_with_contracted_functions_not_classes) — the brand that needs the cast
