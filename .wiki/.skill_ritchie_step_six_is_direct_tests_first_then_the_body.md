---
tags: [skill, ritchie, tests, contracts]
sources: [conversation, skills/ritchie/references/tests-and-body.md, skills/ritchie/scripts/check_body_diff.py]
replaces: [skill_ritchie_step_six_plans_then_writes_tests_blind_then_bodies_with_a_runner]
---

## Decision

Step 6 of ritchie uses no `th` run. Ritchie writes the tests first, from the contracts and a spec of the facts the contracts cannot carry. Then it writes each body in the place of its `todo` line only.

The checks stay:

- the tests against the `todo` file: a bare call fails, a should-panic test passes;
- `scripts/check_body_diff.py`: only the `todo` lines changed, and no `return` skips a postcondition;
- the whole suite green;
- mutants: one per classifier, one per edge comparison.

## Why

**The runs cost more than they saved.** In one session, the config took one pair of runs and component 7 took four. Each run needed a task written with care, and each result needed fixes by hand: private imports, postconditions read as preconditions, contracts copied by the body, missing types. A body run with a runner then needed a git worktree inside the sandbox, a linked `node_modules`, and a clean-up step. The user judged it too complex.

**What the runs gave is kept another way.** The tests are still written before the body, so they cannot copy it. The contract is still the oracle. The mutants check that the tests can tell a wrong body apart. The independence of two authors is lost: the same author writes tests and body. The mutants are the guard for that.

## Cross-references

- [.skill_ritchie_step_six_plans_then_writes_tests_blind_then_bodies_with_a_runner](.skill_ritchie_step_six_plans_then_writes_tests_blind_then_bodies_with_a_runner) — the three-run flow, replaced
- [skill_ritchie_classifiers_get_an_outcome_table](skill_ritchie_classifiers_get_an_outcome_table) — the outcome tables the tests use
