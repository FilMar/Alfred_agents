---
tags: [memory, distiller, td, critic, config]
sources: [conversation, tools/td/src/config.ts, tests/td_config.test.ts, spikes/2026-10-02-extractor-f/main.py]
replaces: [memory_td_question_above_drops_at_the_threshold_and_below_drops_under_it]
---

## Decision

A critic check has a side, `dropWhen`, with two values:

- `atLeast`: the check drops the candidate when the answer is at the threshold or over it (`p >= threshold`).
- `under`: the check drops the candidate when the answer is below the threshold (`p < threshold`).

The rule itself is the same as in the replaced decision. Two things change.

- **The names.** `above` and `below` become `atLeast` and `under`. The type is `CriticCheck`, not `Question`.
- **The contract.** `CriticCheck.drops(p)` states the rule as two implications, one per side. There is no `firesBySpec` helper.

```ts
assert(this.#s.dropWhen !== "atLeast" || result === p >= this.#s.threshold, ...);
assert(this.#s.dropWhen !== "under" || result === p < this.#s.threshold, ...);
```

A probability is a finite number from 0 to 1, both ends included. `NaN` is refused by a contract. If the model writes a number outside that range, it is a world error. The LLM client (component 4) turns it into a failed reply before it calls `drops`.

## Why

**The name carries the edge case.** With `above`, a reader cannot tell if the threshold itself drops. With `atLeast`, the exact threshold drops. With `under`, it stays. The test file fixes both: with threshold 0.4, a rule at exactly 0.4 stays and a rule at 0.39 drops.

**The rule matches the extraction spike**, so the first runs give the spike numbers.

**A helper that the body and the contract both call checks nothing.** The old contract called `firesBySpec` twice and compared the result with itself. An error in the rule passed both times. The two implications state the rule once, apart from the body.

**The edge test bites.** The body was written in ritchie's direct mode. A mutant that turns `>=` into `>` makes the edge test for `atLeast` fail.

## Cross-references

- [.memory_td_question_above_drops_at_the_threshold_and_below_drops_under_it](.memory_td_question_above_drops_at_the_threshold_and_below_drops_under_it) — the replaced decision
- [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question) — the checks and their thresholds
- [memory_td_config_enters_only_as_json_and_keeps_a_frozen_copy](memory_td_config_enters_only_as_json_and_keeps_a_frozen_copy) — how a check is built
