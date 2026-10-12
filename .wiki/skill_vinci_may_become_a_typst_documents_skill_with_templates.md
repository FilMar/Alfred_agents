---
tags: [skill, census, idea, vinci, typst]
sources: [conversation]
---

## Decision

This is an idea, not a rule. Nothing is changed yet.

`vinci` may change from a CV generator to a skill for Typst documents in general. It would keep a set of templates with similar structure. The CV would be one template. A letter and a report would be others.

## Why

The user never used `vinci` for a CV. They want to write many kinds of documents in Typst.

The user called the new skill a "copywriter". That word joins two jobs:

- Writing the content. The model already does this well, so it needs no skill.
- Typesetting in Typst with known structures. This is where a skill earns its place: templates, and the rules to compile them.

So the direction that holds is "Typst documents with templates". If the user wants help with the writing itself, that is a different skill and a different decision.

Name: the naming rule asks for a famous figure whose trait matches the function. An open choice is to keep `vinci`, or to rename after the typesetting trait.

## Cross-references

- [agents_named_after_famous_figures](agents_named_after_famous_figures) — the naming rule
- [skill_convention_direct_cli](skill_convention_direct_cli) — templates and the compile step fit a script under `scripts/`
- [skill_socrate_may_become_a_ti_principle_that_tests_what_the_user_understood](skill_socrate_may_become_a_ti_principle_that_tests_what_the_user_understood) — another open skill idea from the same census
