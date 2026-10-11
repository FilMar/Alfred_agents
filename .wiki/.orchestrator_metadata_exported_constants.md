---
tags: [orchestrator, metadata, static-parsing]
sources: [tools/orchestrator/src/metadata.ts, .wiki/log.md]
---

## Decision

Task scripts declare operational metadata as exported constants at the top of the file — `export const schedule = "..."`, `export const requiresDesktop = true`, optional `export const timeoutSec` — read via static regex at ingestion time, never via dynamic `import()`. `schedule` is a cron expression, validated at ingestion; an invalid string is rejected with a 400 and never reaches the catalog. A task without a schedule is on-demand only.

After registration, `schedule` is owned by the **catalog entry**, not the script: the exported constant is only the initial value, mutable via the Matrix commands `set_schedule`/`pause` without re-audit — the audit judges code, not timing.

## Why

The JSDoc-tag model was replaced at reconciliation (2026-07-15): comments are prose, not data, and regex-over-comments is fragile. Static parsing is not an implementation preference — it is the no-execution-before-verdict rule applied to metadata reading: a dynamic `import()` of the script would run its top-level code before the audit has a verdict. Giving schedule ownership to the catalog entry follows the same logic as the audit itself: the audit judged the code at ingestion time; changing a cron string later is not new code and must not require re-auditing.

## Cross-references

- [orchestrator_adversarial_audit_static](orchestrator_adversarial_audit_static) — the static-parsing principle this applies
- [orchestrator_filesystem_state_no_db](orchestrator_filesystem_state_no_db) — where the catalog entry lives