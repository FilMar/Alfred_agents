---
tags: [orchestrator, wake, wol, scheduling]
sources: [tools/orchestrator/src/wake.ts, tools/orchestrator/src/dispatch.ts, .wiki/orchestrator_overview.md]
---

## Decision

Desktop connectivity is an asynchronous handshake bounded by a wake window, not an indefinite wait:

- The Rasp computes the earliest scheduled task needing the Desktop from the **catalog's** upcoming cron runs, sends a single WoL packet ahead of it (lead time `ORCH_WAKE_LEAD_MIN`, default 30 min), and returns to its loop. Wake bookkeeping lives in one `<ORCH_DIR>/wake.json` (`{sentAt, attempts, alerted}`), deleted on `i_wake` or when the window empties — the only persistent state this pillar added.
- The Desktop calls `i_wake` at boot (systemd service). The Rasp then dispatches every task due within the window — batching avoids repeated wake cycles.
- **Ping reconciliation** (one per tick, when desktop work is relevant): a single level check `ping -c 1 -W 2`. If the Desktop answers, pending desktop instances dispatch directly and `wake.json` clears — no WoL, no callback wait. This is a level check, not a loop.
- On callback timeout: one WoL retry, then a Matrix alert — single-threshold, no polling.
- Shutdown is decided locally by the Desktop's own systemd idle-timer, never commanded remotely: the Desktop is the one that can see its real idle state.

## Why

A ping loop as a wait mechanism never terminates cleanly and hides failure. What is rejected is the ping as *wait mechanism*; the one-shot ping as a level check is part of the design since Phase 2. It closes two holes of the pure event-driven design: a task becoming due while the Desktop was already awake (WoL to an awake machine whose boot callback will never fire again), and a Desktop woken ahead of schedule finding an empty `pending/` (instances materialize only when due). The window is computed from the catalog, not the pending queue — only the catalog can see ahead. Network note: Rasp and Desktop share a local Ethernet LAN; the WoL packet is a local L2 broadcast and never crosses the Tailscale overlay.

## Cross-references

- [orchestrator_minimal_rest_surface](orchestrator_minimal_rest_surface) — `i_wake`, the call-home endpoint
- [orchestrator_bwrap_task_execution](orchestrator_bwrap_task_execution) — what runs after dispatch
- [orchestrator_tailscale_perimeter_matrix_bot](orchestrator_tailscale_perimeter_matrix_bot) — why the WoL path stays off the overlay