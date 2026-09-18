---
tags: [orchestrator, rest, matrix, security]
sources: [conversation, .wiki/log.md]
---

## Decision

Ad-hoc task execution (`run_task`) is exclusive to the Matrix bot, gated by the homeserver's own authentication. It has no REST equivalent. A programmatic trigger sends a Matrix message instead of an HTTP call — same single channel, no parallel path.

## Why

The Tailscale ACL perimeter is network-only: it does not distinguish roles between authorized devices — desktop, laptop and phone all see the same REST surface. If ad-hoc execution were an HTTP endpoint, one compromised device on the tailnet could launch any registered task at any time. The Matrix route adds a second, independent channel instead of relying on tailnet membership alone.

## Cross-references

- [orchestrator_minimal_rest_surface](orchestrator_minimal_rest_surface) — the REST surface this decision keeps clean
- [orchestrator_tailscale_perimeter_matrix_bot](orchestrator_tailscale_perimeter_matrix_bot) — the perimeter and the bot channel
- [orchestrator_run_task_on_rest](orchestrator_run_task_on_rest) — the superseded predecessor