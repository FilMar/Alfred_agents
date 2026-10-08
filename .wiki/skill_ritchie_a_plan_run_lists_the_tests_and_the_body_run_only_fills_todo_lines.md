---
tags: [skill, ritchie, tests, contracts, th]
sources: [conversation, skills/ritchie/references/phase-runs.md, skills/ritchie/scripts/check_body_diff.py, skills/ritchie/SKILL.md]
---

## Decision

Step 6 of ritchie has three runs instead of two.

1. **A plan run** reads the contracts and a `spec.md` written by Ritchie. It writes `plan.md` in prose: for each function, the inputs that break each precondition, the inputs that reach each postcondition, the edge values, and which functions are classifiers, with the rows of their outcome tables.
2. **Ritchie reviews the plan** before the test run starts, and fixes it in place.
3. **A test run** writes the tests from the file and the plan.
4. **A body run** starts at once, next to the plan run. It gets the file and `spec.md`, never the plan or the tests. It replaces each `todo` line, in that place only.

The body may not touch anything else. This is a check, not a request: `scripts/check_body_diff.py <todo-file> <body-file>` cuts the todo file at its todo lines and requires every other line to be the same, in the same order. It also refuses a `return` in a body that has postconditions after it. A function with postconditions has one exit.

## Why

**The errors were planning errors.** In `td` component 7, the test runs read postconditions as preconditions, wrote inputs that never reached the check they named, missed the classifiers, and called `dedupe` on an empty list. A plan in prose shows these errors in a page. A test file hides them in code.

**The plan stays away from the body run.** A body written to pass known cases stops being an independent statement. `spec.md` is different: it holds facts the contracts cannot carry, like a regex or a word list. It is spec, not the output of a run, so both runs may read it.

**A prompt did not stop the body run.** The task said "Keep every assert". The run copied the postconditions next to each early return, so the contracts existed twice. The check script rejects that body before any test runs. On the files of this session it passed the clean config body and refused the component 7 body, at three places.

## Cross-references

- [skill_ritchie_classifiers_get_an_outcome_table_and_runs_write_once](skill_ritchie_classifiers_get_an_outcome_table_and_runs_write_once) — outcome tables, and Ritchie fixes instead of repeating runs
- [skill_ritchie_step_five_runs_tests_blind_then_bodies_with_the_tests_and_a_runner](skill_ritchie_step_five_runs_tests_blind_then_bodies_with_the_tests_and_a_runner) — the earlier shape of the step
