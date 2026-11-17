---
tags: [th, detach, tmp, state]
sources: [tools/alfred/src/command/job.rs, tools/alfred/src/command/cli.rs, tools/alfred/src/command/detach.rs, tools/alfred/src/command/wait.rs, tools/alfred/src/command/runner.rs, tools/th/src/detached-runner.ts@last-typescript, .wiki/th_cli.md@787028b]
---

## Decision

A detached `alfred command run` keeps its state in files in the temp folder (`/tmp`), named `alfred-<name>-<ms>-<hex>.*`. The name is the hat, or the skill when there is no hat. The files are `.out` (agent output), `.log` (thinking + tool calls), `.status` (`running` → `done` / `error: ...` / `timeout`), `.pid` and `.system` (the system prompt). No database for in-progress state — the file set is the state.

## Why

In-progress state is ephemeral and per-run; files match its lifetime exactly. `alfred command wait` reads the same files.

## Known issue

Silent death mid-run, observed twice with `th` on 2026-07-21, root cause unconfirmed. A `--detach` run reported `done` / exit 0 with an empty or truncated `.out` while the `.log` showed the agent stopping mid-reasoning. Until root-caused: treat any suspiciously short `.out` as suspect and check the `.log` tail before trusting it, especially for runs that write files. One incident wiped the old wiki log with a broken shell one-liner before dying, undetected until manually inspected.

## Cross-references

- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — durable run history moves to `tl`, not these files