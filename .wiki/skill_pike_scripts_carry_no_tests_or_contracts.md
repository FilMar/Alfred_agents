---
tags: [skill, pike, scripting, tests, contracts]
sources: [conversation, skills/pike/SKILL.md]
---

## Decision

Pike writes scripts with no test file and no per-function contracts. The preflight at the top of the script is the only contract: it checks arguments, tools, environment variables and paths before any side effect. The real run is the only test: one run for real or with `--dry-run`, and one wrong call.

## Why

A script is glue. The state it works on lives in another process. So the errors that matter come from the world: a missing tool, an empty variable, a failed pipe step, a run cut in half. Ritchie's contracts catch programmer errors, and in a file of 60 lines its tests and asserts outweigh the code. The user found ritchie unfit for scripts in use.

The research backs this up. Tiger Style and the Power of Ten target large critical systems in C or Zig. Tiger Style does not adapt its rules to scripts. It replaces shell scripts with Zig. So the robustness rules come from the script guides instead: strict mode, long flags, a limit on every wait, idempotence, atomic writes.

A script that never ran is a hope, so zero tests does not mean zero runs.

## Cross-references

- [Pike hands off to ritchie past the limit](skill_pike_hands_off_to_ritchie_past_the_limit)
