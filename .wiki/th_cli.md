# th CLI

## Frontmatter

tags: [th, cli, reference, agents, orchestration]
sources: [tools/th/src/cli.ts, tools/th/src/runner.ts, tools/th/src/members.ts, tools/th/src/db.ts]
updated: 2026-07-16

## Overview

`th` (Third Hand) — agent orchestrator. Each `th run` executes a Claude Code agent in a bwrap sandbox with a specialised system prompt (role + de Bono hat) and tracks the run in SQLite (`~/.pi/th.db`).

**Forward-looking (not yet implemented, 2026-07-21)**: [tl_module](tl_module) (Third Log) was founded to replace this local tracking entirely — `th.db` will be removed, `th` will post one event per run to `tl`'s REST API instead (fire-and-forget, never blocking a run). When that lands, `history`/`get` below become empty/stub commands until rewired to query `tl`.

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

**Known issue — silent death mid-run (observed 2026-07-21, unconfirmed root cause)**: twice in the same session, a `--detach` run reported `.status: done` / exit code 0 with an empty or truncated `.out`, while the `.log` showed the agent stopping mid-reasoning (once mid code-write, once mid a botched `sed`/`mv` cleanup) with no final message. Nothing in the visible output flagged the run as incomplete — only reading the raw `.log` exposed it. Until root-caused, treat any `--detach` result with a suspiciously short `.out` as suspect and check the `.log` tail before trusting it, especially for runs that write files (the second incident wiped [log](log) with a broken shell one-liner before dying, undetected until manually inspected).

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
th run --member oracle --task "what do I know about Zettelkasten?"

# With saved output for pipeline
th run --member oracle --task "retrieve on X" > /tmp/out.txt
th run --member alchemist --task "$(cat /tmp/out.txt)"

# Parallel background
th run --member inquisitor --task "find gaps in this idea: ..." --detach
th run --member cartographer --task "suggest hubs for TB cluster" --detach

# With high thinking and timeout
th run --member prospector --task "analyse this codebase" --thinking high --timeout 300
```

## HTTP API (planned, not yet implemented — agreed 2026-07-23)

Following the [style_dual_entrypoint](style_dual_entrypoint) pattern already built for `tb`/`ti`, but **not** a 1:1 mirror: `th run` is a long-running agent execution, not a fast CRUD call, so the API surface is scoped to what a remote caller needs to launch a member and poll it — not full CLI parity (`sandbox-exec`, `models`, `delete`/`promote`/`--from` on member are deliberately excluded as local-only conveniences).

Planned routes:
- `POST /run` — always detached (never blocking a request on a multi-minute agent run), returns `{ id, out, log, status }`
- `GET /runs?status=&member=&limit=` — list/filter runs **in progress or recent**, scoped to what's on disk in `/tmp` — see "No DB for this" below
- `GET /runs/:id` — status only, read from the `.status` file — cheap for polling
- `GET /runs/:id/out` — content of the `.out` file
- `GET /runs/:id/log` — content of the `.log` file
- `POST /member` — create (`name`, `hat`, `role`, `tools`)
- `GET /member` — list
- `GET /member/:name` — detail
- `GET /hats` — list, needed client-side to pick `--hat` when creating a member

Design note: status and output are split into separate GETs (`/runs/:id` vs `/runs/:id/out`/`/log`) specifically so a polling client isn't forced to pull potentially large output just to check if a run is still going.

**No DB for this (revised 2026-07-23, same day as the initial note)**: the user's separate intention to remove `th.db` entirely (see Overview above — history moves to [tl_module](tl_module)) turns out to simplify this API rather than complicate it. "What's in progress right now" is inherently ephemeral, per-run local state, and it's *already* file-backed independent of the DB: every `--detach` run writes `.status`/`.out`/`.log` to `/tmp` (filename `th-<member>-<ts>.status` etc., see "Output files" above) regardless of whether `db.ts` exists. So `GET /runs` becomes a `glob` over `/tmp/th-*.status` plus reading each file's content — the `member` filter is free since it's already embedded in the filename — with no index to keep in sync. `GET /runs/:id`, `/out`, `/log` read directly from those same three files. None of this touches `db.ts`/`listRuns()`; that plan is superseded. Historical runs beyond what's still on disk in `/tmp` are out of scope for `th`'s own API — that's exactly the gap [tl_module](tl_module) is meant to fill once the fire-and-forget event posting lands.

## Cross-references

- [agenti](agenti) — agent list and hats
- [architettura](architettura) — sandbox and filesystem structure
- [orchestrator_overview](orchestrator_overview) — Pillar 4 uses `sandbox-exec` as the execution wrapper for audited tasks
- [roadmap_orchestrator](roadmap_orchestrator) — Phase 2, where the subcommand was tracked
- [tl_module](tl_module) — planned replacement for `th.db`/`history`/`stats`
- [style_dual_entrypoint](style_dual_entrypoint) — the CLI+API pattern this planned work extends to `th`, with the async/job-polling divergence from `tb`/`ti`
