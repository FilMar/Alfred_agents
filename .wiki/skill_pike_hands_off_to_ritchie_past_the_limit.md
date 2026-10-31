---
tags: [skill, pike, ritchie, limits]
sources: [conversation, skills/pike/SKILL.md]
---

## Decision

A pike script stays under 100 lines in shell and 200 in any other language, with every line counted. Some work is not a script: it needs its own data model, more than one entry point, or more lines than the limit. Pike says so and hands it to ritchie. Ritchie's description routes short scripts to pike.

## Why

The 100-line threshold comes from the Google Shell Style Guide: past it, or with control flow that is not simple, rewrite in a structured language. Other languages carry more structure per line, so they get twice the room. Without a hard edge, a script grows into a program that has neither ritchie's guarantees nor a script's lightness.

The skill is a twin of ritchie and not a mode of it. A mode that switches off half of ritchie's principles would weaken its thesis. Edison is the precedent for a twin.

## Cross-references

- [Scripts carry no tests or contracts](skill_pike_scripts_carry_no_tests_or_contracts)
