---
tags: [memory, distiller, td, critic, novelty, ti]
sources: [conversation, SPEC.md@67c44cc, REVIEW.md@67c44cc]
---

## Decision

Extractor row 3 (parent 2) is the active one. It adds two things to row 2.

- A critic check for rules, `is_generic_rule`, with `atLeast` 0.5. It drops a rule that fits almost any task, or whose `do` is advice any careful agent already follows: be careful, check, test, think about trade-offs. The test in the check: doing it and not doing it look the same.
- Three lines in the novelty prompt. An `append` is allowed only when the candidate is the same situation as the `if` of the neighbour. If the situation differs, the verdict is `new`. The `do` of an append is one order to the agent, in Italian, starting with a verb. It is never a note about the rule, such as "Aggiungere il trigger..." or "Estendere la regola...".

Both live in the config row, not in code.

## Why

The first Aristotele run found 4 rules with `do` items that were notes to the critic, not orders. One rule had 7 `do` items, and one of them was a different situation. An append that does not fit its `if` makes a rule fire for the wrong case and carry orders the agent cannot follow.

The `ti` guide already sets the bar: an order is verifiable, and "fai attenzione" leaves no trace. The critic had no question for it, so a generic rule from a real correction passed.

A new row, not a code change, because the extractor is data: [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl).

## Cross-references

- [memory_td_critic_check_drops_at_least_at_the_threshold_and_under_below_it](memory_td_critic_check_drops_at_least_at_the_threshold_and_under_below_it) — how a check drops
- [memory_aristotele_is_a_manual_curator_of_tb_and_ti](memory_aristotele_is_a_manual_curator_of_tb_and_ti) — the run that found the bad appends
