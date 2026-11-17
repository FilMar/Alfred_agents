---
tags: [memory, ti, refine, hits, trust]
sources: [conversation, SPEC.md@47c86ac, REVIEW.md@47c86ac, SPEC.md@67c44cc, tools/alfred/src/rules/refine.rs, tools/alfred/src/rules/cli.rs, tools/alfred/src/rules/store/mod.rs, tools/alfred/src/distill/decide.rs, extensions/rules/claude.sh, extensions/refine/claude.sh]
---

## Decision

`alfred rules` has hit counters and `alfred rules refine`, exactly as `tb` had them. Same fields, same formula, same 0.2 threshold, same 30-day half-life, same archive.

- `alfred rules search` writes a hit on every rule it returns. `--no-hits` skips the write, for curation. The distiller searches the rules with no hit.
- `alfred rules refine` computes `trust` from the counters on every run and stores nothing but `archived_at`. Without `--apply` it is a dry run.
- One formula, one file: `tools/alfred/src/rules/refine.rs`. The `if` is the text of a rule, and there are no related hits.
- A new rule stores `when`. An old rule has none: its floor is `COUNTERS_START`, 2026-10-20, not the date of `tb`.
- A hit and `append-do` write only their own fields. Before, `append-do` rewrote the whole payload and would have wiped the counters.
- The hook passes `--no-archived` to `alfred rules search`. The session start runs `alfred rules refine --apply`.

## Why

`ti` had no counter. A rule injected a hundred times and a rule never returned looked the same. Nothing could prune the store. Since the distiller writes rules on its own, the store grows with no limit. `.design/memory.md` says that what is not used leaves. That held for notes only.

One formula for both stores kept one thing to tune. `tb` is gone, so the rules are now the only store that uses it.

Where it will likely break:

- A rare rule is not a useless rule. A rule for a release fires twice a year. With a 30-day half-life it is archived while still right.
- An archived rule is close to dead. A note was still found by a deliberate `tb search`. A rule reaches the agent almost only through the hook, and the hook hides it.
- A hit means "returned", not "followed". The same holds for notes.

A rule never returned falls under 0.2 after about 40 days. The first real archive comes on 2026-11-29. Watch the list of archived rules in the first runs. If right rules leave, change `HALF_LIFE_DAYS` in `rules/refine.rs`.

## Cross-references

- [memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing](memory_tb_refine_trust_is_a_derived_number_from_zero_to_one_and_the_first_pass_computes_it_and_stores_nothing) — the formula
- [memory_refine_archive_hides_from_hook_only](memory_refine_archive_hides_from_hook_only) — what the archive does
- [memory_refine_apply_runs_at_session_start](memory_refine_apply_runs_at_session_start) — the trigger
