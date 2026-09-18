---
tags: [orchestrator, rest, security, superseded]
sources: [.wiki/log.md]
---

## Decision

`run_task <name>` — ad-hoc start of an already-registered task — is part of the Rasp's REST surface.

**Superseded 2026-07-15** by [orchestrator_run_task_matrix_only](orchestrator_run_task_matrix_only): an HTTP endpoint for ad-hoc execution means a single compromised device on the tailnet could launch any registered task at any time, because the ACL does not distinguish roles between devices. The manual trigger now passes only through the Matrix bot.

This file stays as the record of the original design. It drops out of the live index.

## Why (as it was argued then)

`run_task` only starts already-registered (audited) tasks, so the audit gate still applies; convenience over HTTP seemed consistent with the read endpoints.

## Cross-references

- [orchestrator_run_task_matrix_only](orchestrator_run_task_matrix_only) — the decision that replaced this one