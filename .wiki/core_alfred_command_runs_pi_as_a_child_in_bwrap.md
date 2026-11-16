---
tags: [core, alfred, command, sandbox, bwrap, pi]
sources: [conversation, spec.json@4246539, review.json@4246539, tools/alfred/src/command/runner.rs, tools/alfred/src/command/sandbox.rs]
---

## Decision

`alfred command run` starts pi as a child process: `pi -p --mode json --no-session --no-extensions --no-context-files --no-skills --system-prompt <base>.system [--tools] [--model] [--thinking] -- <task>`. The `Runner` reads one JSON event per line. `text_delta` goes to stdout and `.out`. `thinking_delta` and the tool events go to `.log`, through `sanitize()`.

Only pi runs inside bwrap, never alfred. `wrap()` gives the same profile as `th`, minus `~/.bun`: `/` read-only, writable `cwd`, `~/.pi` and `/tmp`. Without bwrap the run warns on stderr and starts pi bare.

The run always ends with a terminal `Status`: `done`, `error: <reason>` or `timeout`. This holds even when pi cannot start. The timeout wraps the whole read, and `kill_on_drop` kills pi when the timeout fires.

## Why

**pi does the agent loop.** The pi-rust CLI already emits every event as JSON. A harness of our own is a later goal, not part of the port.

**alfred must reach the Deck.** Inside bwrap, alfred could not file the run in hist. So the sandbox wraps only pi.

**`~/.bun` goes.** pi-rust needs no Bun. This was tested by hand under bwrap before the spec.

**`--no-skills` and `--no-context-files`.** In `th`, the system prompt replaced the whole prompt. A skill the run must use is already in the prompt as a `<skill>` block. The prompt goes in a file next to the run files, because it can be long.

**`timeout` is its own status.** The status was `error: Timeout...` in `th`. A caller can now tell a slow run from a broken one.

**Known gap.** No test checks that pi dies after the timeout: the mutant without `kill_on_drop` survives. The `.pid` file of part B makes that test possible.

## Cross-references

- [th_sandbox_bwrap_fixed_binds](th_sandbox_bwrap_fixed_binds) — the `th` profile this one keeps
- [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) — the run files, now named `alfred-<label>-<ms>-<hex>.*`
- [core_alfred_v2_one_binary_serve_on_the_deck](core_alfred_v2_one_binary_serve_on_the_deck) — why alfred replaces `th`
