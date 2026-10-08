---
tags: [skill, ritchie, th, tests, contracts]
sources: [conversation, skills/ritchie/references/phase-runs.md, skills/ritchie/scripts/check_body_diff.py, skills/ritchie/SKILL.md]
replaces: [skill_ritchie_step_five_runs_tests_blind_then_bodies_with_the_tests_and_a_runner, skill_ritchie_a_plan_run_lists_the_tests_and_the_body_run_only_fills_todo_lines]
---

## Decision

Step 6 of ritchie runs three `th run` calls, in order.

1. **Plan.** The run reads the contracts and `spec.md`, the facts the contracts cannot carry. It writes `plan.md` in prose: for each function, the inputs that break each precondition, the inputs that reach each postcondition, the edge values, and which functions are classifiers, with the rows of their outcome tables. Ritchie reviews the plan and fixes it.
2. **Tests, blind.** The run writes the tests from the file and the plan. No body exists yet. Ritchie checks them against the `todo` file.
3. **Bodies, with the tests and a runner.** The run works in a git worktree with the `todo` file, `spec.md` and the tests. It replaces each `todo` line, runs the tests and the type check, and repeats until both are green. It never sees the plan, and it may not edit a test.

After the body run, `scripts/check_body_diff.py` checks that only the `todo` lines changed and that no `return` skips a postcondition. The test file must match the one Ritchie gave the run. Then the mutants and the gate. Each run writes once; Ritchie fixes in place.

## Why

**The plan catches planning errors early.** In `td` component 7 the test runs read postconditions as preconditions, wrote inputs that never reached the check they named, missed the classifiers, and called `dedupe` on an empty list. A plan in prose shows these errors in a page.

**A runner lets the body run find its own errors.** Without one, every error reached Ritchie: `cost: 0` where pi-ai wants an object, two arrays with no type, `compat` shared with the caller, proposed tags read from an always-empty list. The type check, a contract hit by a test, and the outcome table catch all four inside the run.

**Seeing the tests is now safe enough.** The risk is a body bent to pass the tests. The body run cannot change the contracts or the tests: `check_body_diff.py` and the file compare reject that. The tests were written blind, from the plan. The mutants then show whether the tests still tell a wrong body apart.

**The plan stays away from the body run.** The tests already carry what the body needs. The plan would only add a list of cases to fit.

**The cost** is time: the runs no longer run side by side.

## Cross-references

- [.skill_ritchie_step_five_runs_tests_blind_then_bodies_with_the_tests_and_a_runner](.skill_ritchie_step_five_runs_tests_blind_then_bodies_with_the_tests_and_a_runner) — the first runner decision, replaced
- [.skill_ritchie_a_plan_run_lists_the_tests_and_the_body_run_only_fills_todo_lines](.skill_ritchie_a_plan_run_lists_the_tests_and_the_body_run_only_fills_todo_lines) — the blind body decision, replaced
- [skill_ritchie_classifiers_get_an_outcome_table_and_runs_write_once](skill_ritchie_classifiers_get_an_outcome_table_and_runs_write_once) — outcome tables and fixes in place
