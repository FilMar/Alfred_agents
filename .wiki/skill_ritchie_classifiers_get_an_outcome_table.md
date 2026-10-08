---
tags: [skill, ritchie, tests, contracts]
sources: [conversation, skills/ritchie/references/rules.md, tests/td_candidate.test.ts]
replaces: [skill_ritchie_classifiers_get_an_outcome_table_and_runs_write_once]
---

## Decision

A classifier gets an outcome table: a small set of inputs with the expected result, `expect(...).toBe(...)`. A classifier is a pure function whose rule is its own definition: is this text Italian, which drop reason fires, which tags are known. This is the one exception to "a test contains no assert of its own". The table is written from the spec, before the body.

The rule on `th` runs in the replaced decision is gone with the runs: see [skill_ritchie_step_six_is_direct_tests_first_then_the_body](skill_ritchie_step_six_is_direct_tests_first_then_the_body).

## Why

A contract cannot judge a classifier. In `td` component 7 the contract says "the drop names a check the candidate fails". The contract and the body share the same predicate, so they agree even when the predicate is wrong. Three mutants passed every contract-only test: an inverted `isItalian`, a `dedupe` that dropped nothing, a `tagKey` that kept capitals. With the outcome table, five mutants out of five are caught.

## Cross-references

- [.skill_ritchie_classifiers_get_an_outcome_table_and_runs_write_once](.skill_ritchie_classifiers_get_an_outcome_table_and_runs_write_once) — the replaced decision, with the old rule on runs
- [skill_ritchie_step_six_is_direct_tests_first_then_the_body](skill_ritchie_step_six_is_direct_tests_first_then_the_body) — where the table sits in step 6
- [memory_td_candidates_keep_known_tags_and_propose_new_ones](memory_td_candidates_keep_known_tags_and_propose_new_ones) — the classifier behind the tag table
