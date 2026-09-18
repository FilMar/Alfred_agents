---
tags: [orchestrator, matrix, chat, superseded]
sources: [.wiki/orchestrator_overview.md]
---

## Decision

Beyond deterministic commands, the Matrix bot relays an interactive session with the `pi` agent on the Desktop: `/wake` → WoL → `i_wake` → the user chats with `pi` through the Matrix room; the bot forwards messages to a `pi` session over SSH and relays replies. One room = one persistent session with context continuity. `/await <duration>` keeps the Desktop awake explicitly for a declared duration (a timestamp file or `systemd-inhibit`); the systemd idle-timer handles normal shutdowns.

**Superseded 2026-08-08**: the stateless cockpit foundation decided Matrix shuts down entirely — interactive chat, orchestrator notifications and `!tb search` move to the cockpit. See [cockpit_pivot_pi_extension_rpc](cockpit_pivot_pi_extension_rpc). The Matrix-only rationale (second auth channel) was revised, not refuted: the tailnet-only risk is now explicitly accepted for a single-user tailnet.

This file stays as the record of the original design. It drops out of the live index.

## Why (as designed)

Chatting with an agent is arbitrary code execution by definition — so it lives only on Matrix, never on REST, same as `run_task` and for the same reason: a second auth channel, not tailnet membership alone. The idle-timer made mid-conversation shutdown acceptable; the explicit `/await` override was chosen over an automatic heartbeat because it is deterministic.

## Cross-references

- [cockpit_pivot_pi_extension_rpc](cockpit_pivot_pi_extension_rpc) — the decision that replaced this one
- [orchestrator_tailscale_perimeter_matrix_bot](orchestrator_tailscale_perimeter_matrix_bot) — the channel rationale this built on