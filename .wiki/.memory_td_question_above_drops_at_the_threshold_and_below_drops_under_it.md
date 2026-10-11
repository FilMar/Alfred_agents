---
tags: [memory, distiller, td, critic, config]
sources: [conversation, tools/td/src/config.ts, spikes/2026-10-02-extractor-f/main.py]
---

## Decision

A critic question drops a candidate by its `drops` side:

- `above`: the question fires when the answer is at the threshold or over it (`p >= threshold`).
- `below`: the question fires when the answer is under the threshold (`p < threshold`).

A probability is a number from 0 to 1, both ends included. `NaN` and infinite numbers are refused by a contract.

If the model writes a number outside that range, it is a world error. The LLM client (component 4) turns it into a failed reply before it builds a `Probability`. It never reaches the contract.

## Why

This is the rule of the extraction spike: a note drops when `p >= threshold`, a rule drops when `p(is_user_rejection) < 0.4`. The rule is kept so the first runs match the spike numbers.

The edge case matters. With threshold 0.4 and an answer of exactly 0.4, a note drops and a rule stays. The two sides are not mirror images, and a test fixes each case.

The contract of `Question.fires` states the rule as its own function, `firesBySpec`. The body must reach the same answer another way. This is the oracle the tests use.

## Cross-references

- [memory_critic_is_f_textbook_as_a_test_and_no_record_question](memory_critic_is_f_textbook_as_a_test_and_no_record_question) — the questions and their thresholds
- [memory_distiller_td_is_fourteen_components_behind_one_entry_point](memory_distiller_td_is_fourteen_components_behind_one_entry_point) — components 1, 4 and 8
- [memory_extractor_is_data_immutable_config_rows_in_tl](memory_extractor_is_data_immutable_config_rows_in_tl) — where the thresholds are stored
