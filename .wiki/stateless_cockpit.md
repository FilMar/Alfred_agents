# stateless_cockpit

```yaml
tags: [project, cockpit, web-ui, memory]
sources: [conversation]
updated: 2026-08-08
```

## Overview

Proposed next project (2026-08-08). A personal web UI, reachable only inside the tailnet, for talking to the agent from any device. It drops the classic chat model (one long message history) for a **single continuous session with episodic stateless execution**: every request rebuilds a compact context from scratch, the agent answers with no memory of its own, and the session state is re-condensed after each turn. Status: proposed, not started. Foundation should go through the `piano` skill.

## Core loop

Each turn runs this pipeline:

1. User input arrives.
2. Backend assembles the context: **hot memory** (rolling session summary) + retrieval from `tb` and `ti`.
3. A fresh, stateless agent call answers.
4. The exchange is re-condensed asynchronously into the new hot memory.

Hot memory is short-term session state only. Long-term memory stays where it already lives: Third Brain in (retrieval via christopher), Third Brain out (consolidation via platone).

## Components

- **Backend orchestrator** — TypeScript (Fastify or similar). Owns the pipeline above.
- **Slash command router** — deterministic, runs *before* the LLM: `/bash <cmd>` (direct execution, no tokens), `/clean` (reset hot memory), `/detach <task>` (offload to background job), `/edit-memory` (inspect and fix the hot memory).
- **Hot memory store** — lightweight (SQLite or plain files).
- **Frontend** — HTMX + Tailwind, server-driven UI. Widgets (tables, charts, action buttons) injected as HTML fragments.
- **Network** — Tailscale only, no public exposure.

## Amendments (settled in review, 2026-08-08)

The original draft had two weak points: per-turn summarization degrades (a summary of a summary loses detail like a telephone game — the detail cut at turn 3 may be the key at turn 10), and LLM-generated HTML with `hx-post` buttons is a prompt-injection-to-shell path. Agreed fixes:

1. **Raw tail + summary.** Keep the last 2–3 exchanges verbatim; summarize only what is older. Kills most of the degradation, and also fixes the race where message N+1 arrives before the re-summary of message N is done — message N is still in the raw tail.
2. **Append-only facts ledger.** Split the hot memory in two: a narrative part that gets rewritten each turn, and a ledger of decisions and key data that is only *appended*, never re-paraphrased, pruned only by explicit action. What is never rewritten cannot degrade.
3. **Merge, not rewrite.** The summarizer receives the previous summary plus only the last exchange, and emits a delta. With this, `/edit-memory` is an inspection panel, not a hallucination-repair confession.
4. **No LLM-generated HTML.** The model emits JSON matching fixed widget schemas (table, chart spec, action *proposal*). The backend renders fixed templates. Buttons can only point to whitelisted commands; state-mutating ones require confirmation. The model proposes, the deterministic router disposes.
5. **Reuse the existing stack.** The agent is the existing harness launched in a fresh session per turn (SDK or `claude -p`) — do not rebuild orchestration. Charts come from `atlante` (standalone HTML artifacts framed by the frontend), not from a new chart layer.

## Open questions

- **Conflict with Pillar 5 of the orchestrator.** [orchestrator_overview](orchestrator_overview) keeps interactive agent chat **Matrix-only**, because agent chat is arbitrary code execution and tailnet membership alone was judged insufficient auth (one compromised device on the tailnet could act). A web cockpit reachable by any tailnet device reopens exactly that hole. Either the cockpit adds a second auth channel of its own, or the Pillar 5 rationale gets explicitly revised. This must be settled before implementation.
- **`/bash` vs the audit pipeline.** The orchestrator never runs a script that has not passed the adversarial audit. A raw `/bash` endpoint from the cockpit bypasses that. Options: restrict `/bash` to a whitelist, or route it through the same audit/catalog machinery.
- **Where it runs.** Likely split: frontend + router + hot memory on the Rasp (always-on), agent execution on the Desktop via the existing wake machinery ([rasp_node](rasp_node)). Not decided.
- **Relation to the Matrix relay.** The cockpit overlaps with Interactive pi Chat in [orchestrator_overview](orchestrator_overview). Complement (rich UI vs quick chat) or replacement — to decide at foundation time.

## Cross-references

- [orchestrator_overview](orchestrator_overview) — Pillar 5 perimeter rationale and the Matrix-relay chat this overlaps with
- [roadmap](roadmap) — Phase 8 (Personal Server) is the closest existing worksite
- [rasp_node](rasp_node) — where the always-on half would live
- [architettura](architettura) — tb/ti layers used for retrieval
