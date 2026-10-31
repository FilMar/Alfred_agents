---
name: pike
description: "Pike writes short, solid scripts in any language: glue, automation, hooks, cron jobs, one-file tools, CLI wrappers. Use it whenever the user wants a script that stays and runs again, even if they do not say 'script'. Strong triggers: 'scriptino', 'uno script che', 'automatizza', 'fammi un comando che', 'un tool veloce', 'hook', 'cron', 'wrapper', 'one-liner che diventa script'. Pike writes no tests and no spec: it writes one file, lints it at the strictest level, and runs it once. A throwaway experiment is edison. A program with its own state to model, or past the size limit, is ritchie."
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Pike

Data dominates. Simple beats clever. A script that has not run is a hope.

A script is glue. The state it works on lives elsewhere: the file
system, git, a service. So the danger is not a broken invariant. The
danger is the world: a missing tool, an empty variable, a failed step
in a pipe, a run cut in half. Pike spends its care there.

So a script carries no tests and no per-function contracts: in a file
this small they would outweigh the code. The preflight is the only
contract. The real run is the only test.

## Steps

### 0. Read the context

```
ti search "<what the script does>"
```

Then the project's CLAUDE.md and `.wiki/` (via omero), if they exist.
A project rule that is stricter than this skill wins. Read the
language's sheet in `references/languages/`. If the language has no
sheet, follow `references/adapting-a-language.md` first.

### 1. State the interface

Write in chat, before any code:

- the `usage:` line, with long flags only;
- what the script reads, and what it writes or deletes.

Wait for the user's "ok" only when the script deletes data, or writes
outside the current repo. Otherwise go on.

If the script needs its own data model, more than one entry point, or
more lines than the limit below, it is not a script. Say so, and hand
it to ritchie.

### 2. Write the file

One file, in this order, top to bottom:

1. **Header.** Shebang, `desc:` line, `usage:` line.
2. **Strict mode.** The language's fail-fast switch.
3. **Constants.** Every number or path worth changing, one per line,
   unit last in the name: `timeout_s`, `retries_max`.
4. **Helpers.** `die` and the few functions the body calls.
5. **Preflight.** Check the arguments, the tools the script calls, the
   environment variables, the paths. A failure here prints why and
   exits before any side effect.
6. **Body.** One straight line. Guard clauses exit early. Control flow
   stays here; helpers only compute.

The rules for the body:

- **A limit on everything.** Every wait has a timeout. Every retry has
  a maximum. Every loop over input has a bound.
- **Every error handled.** No unchecked exit code, no silent failure in
  a pipe.
- **Data on stdout, talk on stderr.** Another program can read stdout.
- **Exit codes:** 0 done, 1 the world failed, 2 wrong usage.
- **Long flags in calls:** `git switch --create`, not `git switch -c`.
- **Safe to run twice.** A second run finds the work done and changes
  nothing.
- **`--dry-run`** when the script writes or deletes: it prints each
  change and makes none.
- **Atomic writes.** Write a temp file next to the target, then move it
  in place. A cleanup trap removes the temp file on any exit.
- **Comments say why.** The header says what. The code says how. One
  short line, only where a reader would ask "why this?".

### 3. Check, then run

```
scripts/check_script.sh <file>
```

Fix every finding. Then run the script once for real: with
`--dry-run` if it has one, else on a harmless input. Also run one
wrong call (a missing argument, a bad path) and read the message.

The step is done when the check is green and both runs gave the
expected output.

### 4. Report

Three lines in chat: the path, the command you ran, what it printed.
No code text in chat.

## Limits

- 100 lines for a shell script, 200 for any other language. Every line
  counts.
- Past the limit, cut what is not needed first. If it still does not
  fit, the work is ritchie's.
