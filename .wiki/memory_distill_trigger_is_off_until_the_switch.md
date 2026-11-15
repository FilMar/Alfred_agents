---
tags: [memory, distiller, alfred, trigger, switch]
sources: [conversation, spec.json@2dcf7a9, tools/alfred/src/distill/trigger.rs]
---

## Decision

The trigger on ingest is off unless `ALFRED_DISTILL_TRIGGER=on`. When it is on, it runs in active mode with the active extractor row. `ALFRED_DISTILL_MIN_PENDING` and `ALFRED_DISTILL_MAX_AGE_HOURS` set the thresholds, 50 and 24 by default.

Until the switch, a run starts only by hand: `alfred distill --extractor 4`, in shadow.

## Why

`td` still runs in active mode on row 3 at the start of each session. An active trigger in alfred would write the same rules twice. A shadow trigger closes nothing, so the pending total stays over the threshold, and every push would pay for a run.

The other way was a shadow trigger that remembers the sessions it already saw. That is more code, and it is thrown away at the switch.

## Cross-references

- [memory_distill_starts_on_ingest_by_threshold](memory_distill_starts_on_ingest_by_threshold) — the thresholds
- [memory_extractor_row_4_has_rules_only_roles](memory_extractor_row_4_has_rules_only_roles) — the row the trigger uses after the switch
