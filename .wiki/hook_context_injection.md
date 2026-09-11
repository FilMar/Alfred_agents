# Automatic Context Injection

```yaml
tags: [architecture, tb, ti, hook, claude-code, extensions]
sources: [extensions/tb_ti/pi.ts, extensions/tb_ti/claude.sh]
updated: 2026-09-11
```

## Overview

`extensions/tb_ti/` holds two entry points, one per harness, both doing the same job: run on every prompt, before the agent answers, search both `ti` (Third Identity) and `tb` (Third Brain) for the prompt text, and inject the matches straight into the agent's context. This replaces the old manual step of calling `tb search`/`ti search` by hand at the start of a task — the lookup now happens every time, with no explicit call needed.

## The two entry points

- **`pi.ts`** — a pi coding-agent extension. Registers on `pi.on("before_agent_start", ...)`; returns a message with `customType: "ti-tb-context"` and `display: false` (present in context, not shown to the user as a separate chat bubble).
- **`claude.sh`** — a Claude Code `UserPromptSubmit` hook. Reads the prompt from stdin JSON (`jq -r '.prompt'`), and on a match prints `{hookSpecificOutput: {hookEventName: "UserPromptSubmit", additionalContext: <text>}}` — the schema Claude Code expects from this hook type.

Both call the same two CLIs, with the same parameters, in parallel (`Promise.allSettled` in `pi.ts`, backgrounded `&` + `wait` in `claude.sh`):

```
ti search "<prompt>" --limit 3 --min-score 0.6
tb search "<prompt>" --depth 1 --limit 5 --min-score 0.6
```

`ti` results keep `if`/`do`/`tags`(/`score`); `tb` results keep `what`/`why`/`tags`/`kind`(/`score`) read from each hit's `.note`. An empty result (`[]`, or a failed/erroring search) contributes nothing — if both searches come up empty, no context block is injected at all.

## Why it matters

This turns the "Search Before Answer" rule (in `CLAUDE.md`, private global instructions) from a manual discipline into something the harness enforces mechanically: the agent can no longer forget to check `ti`/`tb` before acting, because the check already ran before the first token of the answer. The 0.6 min-score cutoff is exactly the relevance-cutoff task already on the roadmap ([roadmap](roadmap), memory area, via [ti_module](ti_module)) — here it is applied at the injection boundary, not inside `ti search` itself. It builds directly on `tb`/`ti` running on the Rasp ([tb_on_rasp](tb_on_rasp)) — the hook's searches are only fast and reliable because both stores are a single, always-on source of truth, not a local process to spin up per query.

## Cross-references

- [tb_on_rasp](tb_on_rasp) — the Rasp-hosted Qdrant/Ollama instance this hook queries
- [ti_module](ti_module) — the `ti` collection and schema being searched
- [architettura](architettura) — the `tb`/`ti` layers
- [procedural_memory_gaps](procedural_memory_gaps) — gap 5 (read-pattern analytics): this hook is a read path that still logs nothing back to `tl`
