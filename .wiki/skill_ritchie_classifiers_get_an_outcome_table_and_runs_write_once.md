---
tags: [skill, ritchie, tests, contracts, th]
sources: [conversation, skills/ritchie/SKILL.md, skills/ritchie/references/phase-runs.md, skills/ritchie/references/rules.md, tests/td_candidate.test.ts]
---

## Decision

Two changes to ritchie's step 6.

- **A classifier gets an outcome table.** A classifier is a pure function whose rule is its own definition: is this text Italian, which drop reason fires, which tags are known. Its tests name the expected result with `expect(...).toBe(...)`. This is the one exception to "a test contains no assert of its own".
- **A `th` run writes once.** Ritchie does not repeat a run. It fixes the tests and the body in place, then runs the checks again and tells the user what it fixed. A contract that let a wrong body pass is fixed first.

The mutant check now covers each classifier (invert its result) and each edge comparison.

## Why

**A contract cannot judge a classifier.** In `td` component 7, the contract says "the drop names a check the candidate fails". The contract and the body share the same predicate, so they agree even when the predicate is wrong. Three mutants passed every contract-only test: an inverted `isItalian`, a `dedupe` that dropped nothing, a `tagKey` that kept capitals. A contract gap also let a real bug through: the body took the proposed tags from an always-empty list. With the outcome table, five mutants out of five are caught.

**Repeated runs cost more than fixes.** Component 7 took four runs. Each one fixed the last error and brought a new one: private imports, postconditions expected to panic, `expect(...).toBe` against the old rule, `dedupe` called on an empty list, a cut of the known tags missed. Writing a precise task cost more than writing the code. The user chose: the runs write, Ritchie fixes.

The blind split stays. The test run still never sees the body, so the first draft of the tests is still written from the contracts.

## Cross-references

- [skill_ritchie_step_five_runs_tests_blind_then_bodies_with_the_tests_and_a_runner](skill_ritchie_step_five_runs_tests_blind_then_bodies_with_the_tests_and_a_runner) — the earlier shape of step 6
- [style_type_checks_are_private_static_methods_of_their_class](style_type_checks_are_private_static_methods_of_their_class) — where the checks live
- [memory_td_candidates_keep_known_tags_and_propose_new_ones](memory_td_candidates_keep_known_tags_and_propose_new_ones) — the classifier behind the tag table
