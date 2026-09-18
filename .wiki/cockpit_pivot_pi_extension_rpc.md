---
tags: [cockpit, pi-extension, rpc, memory]
sources: [conversation, .wiki/stateless_cockpit.md]
---

## Decision

The cockpit is a **TypeScript extension of pi itself**, run in RPC mode (stdin/stdout JSONL) as a single persistent process. Pivot decided 2026-08-10; no implementation started — this records the architectural decision only.

The design maps onto native pi extension hooks (verified against pi's `extensions.md`/`compaction.md`):

- **bank / ledger / condense** (delta-merged summary + append-only ledger) → hook `session_before_compact`, replacing the bespoke condense logic.
- **retrieval from `tb`/`ti` every turn** → hooks `before_agent_start` / `context` — no external process needed.
- **`/mem`, `/safe`, `/clean`, hats, `/edit-memory`** → `pi.registerCommand()`, native slash commands.
- **`emit_widget`** → `pi.registerTool()`, kept only if a widget output still makes sense without a browser — open question.
- **Process persistence** → pi's RPC mode itself: one warm process, no per-turn spawn.

**Trade-off, explicit and accepted**: the original "web UI from any device on the tailnet" requirement is dropped. Access becomes RPC/CLI behind the tailnet — a phone needs an SSH/terminal client, not a browser tab. Deliberate scope cut, not an implementation detail. Branch `feature/cockpit-skeleton` is untouched; no merge or cleanup obligation.

## Why

The pause diagnosis (2026-08-09) found the slowness mechanical: `runAgent` spawned a fresh `bun` process every turn — fork + bwrap + SDK boot + session init — before the model even answered. The pivot removes that cost by construction: the process never dies between turns, so there is nothing to keep warm. The bank/ledger/condense machinery still matters for the local target (16GB VRAM, long-history degradation is real there) — it maps onto hooks instead of bespoke code. The spawn-per-turn design, not the model, was the problem; the clunkiness beyond that stays open until a retest on the real local model.

## Cross-references

- [cockpit_founded_web_ui](cockpit_founded_web_ui) — the superseded founding design this pivots away from
- [orchestrator_matrix_chat_relay](orchestrator_matrix_chat_relay) — the chat relay this replaces
- [memory_ti_context_action_rules](memory_ti_context_action_rules) — the retrieval the hooks inject