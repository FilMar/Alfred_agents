---
tags: [memory, distiller, td, safety]
sources: [tools/td/SPEC_ACTIVE.md@61d5a9f, tools/td/src/save.ts, tools/td/src/distiller.ts, tools/td/src/cli.ts]
---

## Decision

`td distill --active --max-saved <n>` caps the writes of one run.

- A `Budget` counts the writes. It belongs to the run, not to a session.
- Only a real write counts: a verdict whose action is not "nothing". Shadow mode never touches the budget.
- When the cap is spent, the item is not written. The failure `cap: --max-saved reached` is added once to the exchange.
- That failure keeps the session open. Its exchanges stay pending.
- A later run with a larger cap takes the whole session again. The items saved before show up as neighbours and come out as `duplicate`.

Without the flag there is no cap.

## Why

The first live saves are the ones most likely to be wrong, and some writes cannot be undone. `ti` has no command to remove one `do` from a rule. A cap bounds what a bad prompt or a bad model day can do to the stores in one run.

Closing a capped session would lose the items that did not fit. Keeping it open costs one more pass, and that pass is cheap because of the duplicates.

First live run, one session of 38 exchanges: with a cap of 6, six items were written and the 38 stayed pending. With a cap of 20, the second pass wrote five more items, found eight duplicates, and closed the session.

## Cross-references

- [memory_td_distilled_is_set_for_a_whole_session_at_the_end_to_the_run_time](memory_td_distilled_is_set_for_a_whole_session_at_the_end_to_the_run_time) — why the capped session is redone whole
- [memory_distillation_stays_manual_for_now](memory_distillation_stays_manual_for_now) — the manual path that stays until the automatic one is trusted
- [memory_human_gate_is_the_bottleneck](memory_human_gate_is_the_bottleneck) — a cap and a judge in place of a human gate
