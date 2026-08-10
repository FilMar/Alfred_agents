# stateless_cockpit

```yaml
tags: [project, cockpit, pi-extension, memory]
sources: [conversation, tools/cockpit/README.md]
updated: 2026-08-10
```

## Overview

Talking to the agent with a **single continuous session with episodic stateless execution**: every turn rebuilds a compact context from scratch, the agent answers with no memory of its own, and the session state is re-condensed after each turn. Status: **pivoted 2026-08-10** — see Pivot below; this supersedes the Pause and drops the web UI entirely. Founded 2026-08-08 via the `piano` skill — `tools/cockpit/` holds README.md, justfile and CLAUDE.md (pre-pivot artifacts, not yet updated to match). It is meant to **replace both the Matrix interactive chat and pi-web**; Matrix shuts down entirely (see Foundation decisions below). `pi-web` stays up in the meantime — nothing so far has replaced it.

## Pivot (2026-08-10)

**Supersedes the Pause below.** Decision: drop the web UI (Hono + HTMX + Tailwind) and the external app that spawned a fresh pi SDK session per turn. The cockpit becomes instead a **TypeScript extension of pi itself**, run in **RPC mode** (stdin/stdout JSONL) as a single persistent process. This removes the spawn-per-turn cost mechanically — there is no more per-turn `spawnSandboxed` of a fresh `bun` process (fork + bwrap + SDK boot + session init) to eliminate, because the process never dies between turns. This *is* the "persistent process" fix that was next-step 1 under Pause, arrived at by a different route.

Architecture mapped onto native pi extension hooks (verified against `extensions.md` and `compaction.md` in the pi docs):

- **bank / ledger / condense** (delta-merged summary + append-only ledger, see Amendments below) → hook `session_before_compact`: receives the messages to summarize and the previous summary, lets the extension return a custom `{ compaction: { summary, ... } }` or `{ cancel: true }`. Replaces the bespoke condense logic designed from scratch.
- **retrieval from `tb`/`ti` every turn** → hooks `before_agent_start` / `context`: inject messages and modify the system prompt before each model call, with no external process needed.
- **`/mem`, `/safe`, `/clean`, hats (`/black`, `/white`, ...), `/edit-memory`** → `pi.registerCommand()`, native slash commands with `getArgumentCompletions()` for autocomplete.
- **`emit_widget`** → `pi.registerTool()` — kept only if a widget-shaped output is still useful once there is no browser to render it in; open question, not decided.
- **process persistence** → pi's RPC mode itself: one warm process, JSONL over stdin/stdout.

**Trade-off, explicit and accepted**: this drops the original requirement of "a web UI reachable from any device on the tailnet via browser." Access becomes RPC/CLI behind the tailnet — a phone needs an SSH/terminal client, not a browser tab with rendered widgets. This is a deliberate scope cut, not an implementation detail.

`feature/cockpit-skeleton` is unaffected by the pivot: still left as-is, no merge or cleanup obligation. No implementation of the pivot has started; this section records the architectural decision only.

## Pause (2026-08-09)

**Superseded by Pivot above (2026-08-10).** Kept for the diagnosis history — the spawn-per-turn cost identified here is what the pivot eliminates by construction. **Not abandoned — paused pending a decision.** The build is further along than earlier wiki text suggested: real implementation exists on branch `feature/cockpit-skeleton` (never merged to `main`), through commit `08c6f73` ("ezperimental cockpit", 2026-08-09). Milestones reached on the branch: Hono server + HTMX UI + command handlers, `bank`/`router`/`turn` modules with tests, and three working edges — `retrieve` (direct `tb`/`ti` calls), `condense` (direct Ollama call), `runAgent` (a generalized `th` session). The branch is left as-is, no merge or cleanup obligation.

**Why paused**: the first end-to-end test (against a cloud model, not the local target) came back slow and clunky. Diagnosed in conversation:
- **Slow — mechanical, not a model problem.** `runAgent` does `spawnSandboxed` of a fresh `bun` process every turn (fork + bwrap + SDK boot + session init), paying that cost even on trivial exchanges, before the model answers at all.
- **Clunky — not explained by model size** in this test (the test model was a 300B-class cloud model, not the 16GB-VRAM local target) — so the cause is still open, to be re-tested against the real target model.

**What is not in question**: the target deployment is a **local model within 16GB VRAM** (candidate to try: `dwarfstar`), not the cloud model used in the test. At that model size, the long-history degradation problem the whole bank/ledger/condense design exists to solve is still real — that part of the architecture is not being reconsidered.

**Agreed next steps, in order, before resuming build:**
1. **Model-independent fix**: replace spawn-per-turn with a persistent process — keep the `bun`/`bwrap`/SDK process warm, rebuild only the *context* each turn from the bank (not a fresh OS process, and not a growing SDK session history either — the per-turn context assembly stays as designed). Worth doing regardless of which model ends up in use.
2. **Re-run the quality test (~20-30 turns) against the actual local candidate model** (16GB VRAM), not the cloud model — this is what actually answers whether the bank/ledger/condense memory system is needed at that scale or is overkill even there.
3. Only after that test: decide whether to resume the implementation as designed or simplify it.

## Core loop

Each turn runs this pipeline:

1. User input arrives.
2. Backend assembles the context: **hot memory** (rolling session summary) + retrieval from `tb` and `ti`.
3. A fresh, stateless agent call answers.
4. The exchange is re-condensed asynchronously into the new hot memory.

Hot memory is short-term session state only. Long-term memory stays where it already lives: Third Brain in (retrieval via christopher), Third Brain out (consolidation via platone).

## Components (pre-pivot, superseded)

Recorded as designed before the Pivot above; the Hono/HTMX backend and per-turn SDK spawn described here are dropped. Kept for what still transfers 1:1 onto pi extension hooks (see Pivot's mapping) — the bank format, the slash command list, and the amendments below are unaffected by the pivot.

- **Backend** — TypeScript on Bun, **Hono** (settled at foundation: same dual-entrypoint pattern as `tb`/`ti`, see [style_dual_entrypoint](style_dual_entrypoint) — Fastify discarded).
- **Agent** — the **pi SDK** (`@earendil-works/pi-coding-agent`), fresh session per turn, full toolset (skills, web, bash), wrapped in `th`'s sandbox. Model backend is Ollama.
- **Slash command router** — deterministic, runs *before* the LLM: `/bash <cmd>` (user terminal in the browser — a user feature, not an agent tool), `/mem <name>` (switch memory bank), `/clean` (reset current bank), `/safe` (menu toggling the sandbox read/write directory allowlist of the current bank), `/black`, `/white`, ... (apply a thinking hat from `tools/th/hats/` to the next turn), `/detach <task>` (offload to background job), `/edit-memory` (inspect and fix the bank file), `/wake` (future: wake the Desktop and repoint the model URL).
- **Memory banks** — plain markdown files, one per bank (SQLite discarded). Each bank holds: summary (delta-merged), append-only ledger, raw tail of last 3 exchanges, and its `/safe` profile. Banks swap atomically on `/mem`.
- **Frontend** — HTMX + Tailwind, server-driven UI. Widgets rendered by the backend from JSON the agent emits via an `emit_widget` tool.
- **Network** — Tailscale only, no public exposure. Single user; multi-user fully out of scope.

## Amendments (settled in review, 2026-08-08)

The original draft had two weak points: per-turn summarization degrades (a summary of a summary loses detail like a telephone game — the detail cut at turn 3 may be the key at turn 10), and LLM-generated HTML with `hx-post` buttons is a prompt-injection-to-shell path. Agreed fixes:

1. **Raw tail + summary.** Keep the last 2–3 exchanges verbatim; summarize only what is older. Kills most of the degradation, and also fixes the race where message N+1 arrives before the re-summary of message N is done — message N is still in the raw tail.
2. **Append-only facts ledger.** Split the hot memory in two: a narrative part that gets rewritten each turn, and a ledger of decisions and key data that is only *appended*, never re-paraphrased, pruned only by explicit action. What is never rewritten cannot degrade.
3. **Merge, not rewrite.** The summarizer receives the previous summary plus only the last exchange, and emits a delta. With this, `/edit-memory` is an inspection panel, not a hallucination-repair confession.
4. **No LLM-generated HTML.** The model emits JSON matching fixed widget schemas (table, chart spec, action *proposal*). The backend renders fixed templates. Buttons can only point to whitelisted commands; state-mutating ones require confirmation. The model proposes, the deterministic router disposes.
5. **Reuse the existing stack.** The agent is the existing harness launched in a fresh session per turn (SDK or `claude -p`) — do not rebuild orchestration. Charts come from `atlante` (standalone HTML artifacts framed by the frontend), not from a new chart layer.

## Foundation decisions (2026-08-08)

Settled via `piano`; these close every open question of the original proposal.

1. **Pillar 5 revised, not satisfied.** Security is deferred: tailnet-only access is enough for now, an account step can be added later. The risk of Pillar 5 in [orchestrator_overview](orchestrator_overview) (one compromised tailnet device = shell) is **accepted, not closed**. The `th` sandbox covers the filesystem, not the network.
2. **Matrix shuts down entirely.** The cockpit replaces both the Matrix interactive chat and pi-web. Orchestrator notifications become a feed shown at the next cockpit opening (v1 — no push channel yet). `!tb search` becomes a normal cockpit turn.
3. **Agent via pi SDK, not direct Ollama calls.** A direct chat-completion backend was considered and discarded: without tools the agent cannot use skills, run bash, or search the web — useless for the real use case. Fresh SDK session per turn, full toolset, `th` sandbox. This **reopens the injection→shell path that review amendment 4 had closed**; the risk is accepted under the single-user tailnet profile. Amendment 4 still holds for the UI layer (no LLM-generated HTML — widgets are JSON via an `emit_widget` harness tool).
4. **Hot memory = `/mem` banks.** One markdown file per bank, three sections: summary (delta-merged), ledger (append-only; the agent *proposes* an entry, the user confirms, the router writes), tail (last 3 exchanges verbatim, maintained mechanically by the backend). Plus a per-bank `/safe` profile — default write allowlist: `essays/`, `dot_file/`, `alfred`. No SQLite.
5. **v1 runs entirely on the Rasp** (already provisioned: Qdrant + Ollama, see [rasp_node](rasp_node)). No Rasp/Desktop split at start. Moving heavy work to the Desktop is a pure-configuration future step: repoint the Ollama URL + a `/wake` command reusing the orchestrator's WoL machinery.
6. **Hats from `tools/th/hats/`** via `/black`-style commands, one hat per turn, applied as a system-prompt overlay on the fresh call. Multi-member orchestration (annibale) is out of the v1.
7. **`/bash` audit question dropped.** `/bash` is the *user's* terminal in the browser, not an agent tool — the adversarial-audit pipeline protects against agent-proposed scripts, which this is not.
8. **sshfs for remote repos rejected.** Mounts hang on disconnect and per-file latency kills agent I/O. The path for repos owned by other hosts: `/wake` + run the agent on the host that owns the repo, or plain git clone on the Rasp.

## Cross-references

- [orchestrator_overview](orchestrator_overview) — Pillar 5 rationale (risk now accepted, see decisions) and the Interactive pi Chat this replaces
- [roadmap](roadmap) — worksite 4, now paused; Phase 8 (Personal Server) is the closest numbered phase
- [rasp_node](rasp_node) — the host of the whole v1
- [style_dual_entrypoint](style_dual_entrypoint) — the Hono pattern the backend follows
- [architettura](architettura) — tb/ti layers used for retrieval
