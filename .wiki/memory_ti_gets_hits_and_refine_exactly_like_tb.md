---
tags: [memory, ti, refine, hits, trust]
sources: [conversation, SPEC.md@47c86ac, REVIEW.md@47c86ac, tools/ti/src/refine.ts, tools/ti/src/identity.ts, tools/tb/src/refine.ts]
---

## Decision

`ti` has hit counters and `ti refine`, exactly as `tb` has them. Same fields, same formula, same 0.2 threshold, same 90-day half-life, same archive.

- `ti search` writes a hit on every rule it returns. `--no-hits` skips the write, for curation. `td` searches `ti` with no hit.
- `ti refine` computes `trust` from the counters on every run and stores nothing but `archived_at`. Without `--apply` it is a dry run.
- One formula, one file: `tb/src/refine.ts` takes a small `Counted` shape. `countedOf` maps a rule onto it: the `if` is the text, and there are no related hits.
- A new rule stores `when`. An old rule has none: its floor is `COUNTERS_START` of `ti`, 2026-10-20, not the date of `tb`.
- A hit and `append-do` write only their own fields. Before, `append-do` rewrote the whole payload and would have wiped the counters.
- The hook passes `--no-archived` to `ti search`. The session start runs `ti refine --apply` next to `tb refine --apply`.

## Why

`ti` had no counter. A rule injected a hundred times and a rule never returned looked the same. Nothing could prune the store. Since `td` writes rules on its own, the store grows with no limit. `.design/memory.md` says that what is not used leaves. That held for notes only.

One formula for both stores keeps one thing to tune. A change to the weights is a rerun in both.

Where it will likely break:

- A rare rule is not a useless rule. A rule for a release fires twice a year. With a 90-day half-life it is archived while still right.
- An archived rule is close to dead. A note is still found by a deliberate `tb search`. A rule reaches the agent almost only through the hook, and the hook hides it.
- A hit means "returned", not "followed". The same holds for notes.

A rule never returned falls under 0.2 after about 119 days. The first real archive comes around mid-February 2027. Watch the list of archived rules in the first runs. If right rules leave, give `ti` its own half-life.

## Cross-references

- [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) — the formula
- [memory_refine_archive_hides_from_hook_only](memory_refine_archive_hides_from_hook_only) — what the archive does
- [memory_refine_apply_runs_at_session_start](memory_refine_apply_runs_at_session_start) — the trigger
