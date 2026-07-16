# th CLI

## Frontmatter

tags: [th, cli, reference, agents, orchestration]
sources: [tools/th/src/cli.ts, tools/th/src/runner.ts, tools/th/src/members.ts, tools/th/src/db.ts]
updated: 2026-07-16

## Overview

`th` (Third Hand) — agent orchestrator. Each `th run` executes a Claude Code agent in a bwrap sandbox with a specialised system prompt (role + de Bono hat) and tracks the run in SQLite (`~/.pi/th.db`).

## member

```bash
th member create <name> --hat <hat> --role "<role>" [--tools <csv>] [--tmp]
th member create <name> --from <global>   # clone from global member
th member list [--local | --global | --tmp]
th member get <name>
th member delete <name>
th member promote <name> [--force]        # from local/tmp → ~/.th/members/
```

- Name limited to `[a-zA-Z0-9_-]` (path traversal protection)
- Default tools: `read,bash`
- `--tmp`: saves to `/tmp/.th/members/` instead of `.th/members/`
- Resolution order: `.th/members/` first, then `~/.th/members/`, then `/tmp/.th/members/`
- If the global member exists but not the local one, `th run` auto-instantiates it in `.th/members/`

## hats

```bash
th hats list
th hats get <name>
```

De Bono hats define the cognitive frame. Directory: configured via `TH_HATS_DIR` env var (default: embedded in the distribution).

## run

```bash
th run --member <name> --task "<task>" [options]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--thinking <level>` | Extended thinking: off, minimal, low, medium, high, xhigh. Reasoning goes to `/tmp/th-<member>-<ts>.log` |
| `--model <provider/id>` | E.g. `anthropic/claude-opus-4-7`. Default: global pi setting. |
| `--detach` | Background: returns immediately `{pid, out, log, status}`. Status in `/tmp/th-*.status` |
| `--timeout <sec>` | Aborts the session after N seconds |

**bwrap sandbox**: automatic if `bwrap` is in PATH. Read-only on everything except `cwd`, `~/.pi`, `~/.bun`, `/tmp`. If `bwrap` is missing, `th run` proceeds unsandboxed but warns on stderr (`warn: bwrap non disponibile — esecuzione SENZA sandbox`) — it never degrades silently.

**Output files** (in `/tmp`):
- `.out` — agent output
- `.log` — thinking + tool calls
- `.status` — `running` → `done` / `error: ...` / `timeout`

## sandbox-exec

```bash
th sandbox-exec -- <bin> <args...>   # e.g. th sandbox-exec -- bun run script.ts
```

Runs an arbitrary binary inside the same bwrap sandbox as `th run` (read-only everywhere except `cwd`, `~/.pi`, `~/.bun`, `/tmp`), forwarding stdio and exit code. Flags after `--` pass through to the binary (`passThroughOptions`).

Unlike `th run`, it **fails with an explicit error if `bwrap` is not installed** — whoever asks for the sandbox must not get a bare execution. Built as the execution wrapper for the Raspberry Orchestrator's audited tasks ([orchestrator_overview](orchestrator_overview), Pillar 4): remotely via `ssh ... th sandbox-exec bun run <path>`, while the local path on the Rasp calls `sandboxExec` in-process.

## models

```bash
th models   # list models available for the configured API keys
```

## history / get

```bash
th history [--member <name>] [--limit <n>]   # default limit: 20, descending order
th get <runId>                                 # metadata + output if still on disk
```

Runs tracked in `~/.pi/th.db` (table `runs`): id, member, task (truncated to 300 chars), started_at, finished_at, status, out_path, log_path.

## Typical examples

```bash
# Simple execution
th run --member oracolo --task "what do I know about Zettelkasten?"

# With saved output for pipeline
th run --member oracolo --task "retrieve on X" > /tmp/out.txt
th run --member feynman --task "$(cat /tmp/out.txt)"

# Parallel background
th run --member socrate --task "find gaps in this idea: ..." --detach
th run --member aristotele --task "suggest hubs for TB cluster" --detach

# With high thinking and timeout
th run --member indiana --task "analyse this codebase" --thinking high --timeout 300
```

## Cross-references

- [agenti](agenti) — agent list and hats
- [architettura](architettura) — sandbox and filesystem structure
- [orchestrator_overview](orchestrator_overview) — Pillar 4 uses `sandbox-exec` as the execution wrapper for audited tasks
- [roadmap_orchestrator](roadmap_orchestrator) — Phase 2, where the subcommand was tracked
