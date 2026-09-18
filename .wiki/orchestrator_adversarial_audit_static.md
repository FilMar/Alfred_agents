---
tags: [orchestrator, audit, security, static-analysis]
sources: [tools/orchestrator/src/metadata.ts, .wiki/orchestrator_overview.md]
---

## Decision

Every task script passes an adversarial audit at ingestion time, before it can be registered. A cloud agent reads the code and reasons adversarially about it — no execution. It must actively try to find ways to break the system, escalate privileges, or delete data.

- Verdicts: `PASS` (registered), `FAIL` (discarded, deleted — no retention), `WARNING` (Matrix notification, human approval to register).
- The same call produces a human-readable summary (2-3 lines + numbered steps) — informational only, sent to Matrix for every task, no second round-trip.
- Audit runs at ingestion, decoupled from wake/dispatch time: the Rasp only ever reads scripts that already carry a verdict.
- **No-execution-before-verdict is systemic**: every stage touching an unaudited script — including reading its metadata — uses static parsing (regex or AST), never `import()` or module evaluation. A dynamic import runs top-level code as a side effect of merely reading it.
- Planned evolution, not yet implemented: adversarial dynamic execution in an ephemeral Docker container (no egress, decoy filesystem) to turn hypothesis into evidence. Ship static first.

## Why

An LLM asked "is this safe?" produces ambiguity; an LLM asked "find a way to break this" produces findings. The static-only rule exists because a dynamic import of unaudited code *is* an execution — the audit would happen after the damage it exists to prevent.

## Cross-references

- [orchestrator_metadata_exported_constants](orchestrator_metadata_exported_constants) — static parsing applied to script metadata
- [orchestrator_bwrap_task_execution](orchestrator_bwrap_task_execution) — the separate sandbox for already-audited execution