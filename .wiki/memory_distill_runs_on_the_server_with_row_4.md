---
tags: [memory, distiller, alfred, trigger, switch]
sources: [conversation, tools/alfred/deploy/alfred.service, tools/alfred/src/distill/trigger.rs, extensions/tb_refine/claude.sh]
replaces: [memory_distill_trigger_is_off_until_the_switch@5a0a1fc]
---

## Decision

Since 2026-11-17 the distiller runs only in `alfred serve`, on the Deck. Extractor row 4 is active, and row 3 is not. `tools/alfred/deploy/alfred.service` sets `ALFRED_DISTILL_TRIGGER=on`. After each ingest, the server starts an active run once `ALFRED_DISTILL_MIN_PENDING` turns wait (50), or once the oldest pending turn is `ALFRED_DISTILL_MAX_AGE_HOURS` old (24). The session start hook runs only `alfred rules refine --apply`; `td` is no longer started.

## Why

**One writer of rules.** `td` on row 3 and alfred on row 4 would write the same rules twice. The switch stops `td` and starts the trigger in one change.

**Row 4 was checked on real data first.** A shadow run on a reopened session found 3 of the 4 corrections that row 3 had found on the same turns. Its critic dropped one rule as generic (`is_generic_rule` 0.6). Its quote check dropped a user proposal that was not a correction. Its novelty gave `append` to the two that passed. An earlier shadow run on the same session gave zero rules: one run is not a verdict, because the model varies.

**The trigger is in the unit, not a drop-in.** The switch is permanent, and filcloud_init keeps units as files in a repo.

**A client needs `ALFRED_URL` in its environment.** The hooks read it from `env.sh`. A Claude Code process started before the variable existed runs the hooks with no server: the rules search injects nothing and the ingest is lost until `alfred hist ingest --transcript` runs by hand.

## Cross-references

- [memory_distill_starts_on_ingest_by_threshold](memory_distill_starts_on_ingest_by_threshold) — the thresholds
- [memory_extractor_row_4_has_rules_only_roles](memory_extractor_row_4_has_rules_only_roles) — what row 4 holds
