---
tags: [skill, pike, languages, gate]
sources: [conversation, skills/pike/references/adapting-a-language.md, skills/pike/scripts/check_script.sh]
---

## Decision

Pike has one sheet per language in `references/languages/` (bash, python, typescript). A language with no sheet first goes through `references/adapting-a-language.md`: seven questions (run, fail fast, flags, die, subprocess, files, gate). The answers become a sheet with a tested skeleton and a new branch in `check_script.sh`. For a language with no gate, `check_script.sh` returns `FAIL`, not `SKIP`.

## Why

Any language can hold a short, good script, so the process is the same as ritchie's: a fixed set of questions instead of improvising each time. The questions ask only for what a script needs. They do not ask about structs or tests.

The first version printed `SKIP` and passed, so a script in an unknown language went out with no linter. Failing closed makes the missing gate visible.

TypeScript runs on Deno: it runs the file directly and has the type checker, linter and formatter built in. The gate turns off `no-import-prefix`, because inline `jsr:` imports are what makes a one-file script possible. It also runs with `--no-lock`, so it does not write a lock file into the user's project. Rust has no sheet: stable cargo cannot run a `.rs` file as a script yet.
