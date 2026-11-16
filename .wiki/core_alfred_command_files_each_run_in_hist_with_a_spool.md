---
tags: [core, alfred, command, hist, spool, archive]
sources: [conversation, spec.json@d6217bc, review.json@d6217bc, tools/alfred/src/command/archive.rs, tools/alfred/src/command/spool.rs, tools/th/src/archive.ts]
---

## Decision

A finished run becomes three rows in hist: a session, a subtask exchange and its contents. `rows()` builds them from the messages of `agent_end` with `Harness::Pi`, so model, tokens, text and tools come out as they do for a pi session in `hist/ingest`. The exchange is `kind: subtask`, its actor is the label, and its id is `derived_id(run id, "run")`. `meta` holds status, `finished_at`, `duration_s`, and `timeout_s`, `thinking`, `skill` and `cost_usd` when they apply.

`archive()` sends the rows with one 2-second deadline for all three POSTs. When there is no `ALFRED_URL` or the send fails, the rows go to `$XDG_STATE_HOME/alfred/spool/<job>.unarchived`. `run` and `wait` drain the spool first, within 2 seconds. A file leaves the spool only once it is sent. `--no-archive` skips both.

## Why

**The archive is the only home of a run.** The run files in `/tmp` are wiped. If a failed send were dropped, the run would be lost. The spool keeps it in a folder that survives a reboot. This keeps the rule of `th`.

**A run never fails because of the archive.** The Deck can be off. One deadline for the whole send caps the cost at 2 seconds. With a deadline per request it would be 6.

**`archive()` returns `Archived`.** Its cases are `Sent`, `Spooled` and `Lost`. In `th` the archive returned nothing, so "never fails, never loses quietly" could not be tested.

**Timestamps carry milliseconds.** hist accepts only `YYYY-MM-DDTHH:MM:SS.mmmZ`. jiff prints nanoseconds, and hist refused every row. Only the run against a real server showed it. `rows()` now asserts `is_timestamp()` on the start.

**Known gap.** No test sees a spool file leave after a good send. `Client` is built only from `ALFRED_URL`, and other tests change that variable in parallel. A `Client::at(url)` would close the gap.

## Cross-references

- [core_alfred_command_runs_pi_as_a_child_in_bwrap](core_alfred_command_runs_pi_as_a_child_in_bwrap) — where the messages come from
- [memory_tl_work_archive_not_event_log](memory_tl_work_archive_not_event_log) — why runs go to the archive
