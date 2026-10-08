---
tags: [skill, ritchie, tests, contracts, th]
sources: [conversation, skills/ritchie/scripts/th_write.sh, skills/ritchie/references/tests-and-body.md]
replaces: [skill_ritchie_step_six_is_direct_tests_first_then_the_body]
---

## Decision

Step 6 of ritchie goes back to two `th` runs, called through one script:

```
scripts/th_write.sh tests <todo-file> <spec-file> <test-file>
scripts/th_write.sh body  <todo-file> <spec-file> <test-file>
```

The script fixes everything about the run. Ritchie passes only the files.

| | tests | body |
|---|---|---|
| hat | `black-core`: finds the inputs that break the code | `white-core`: neutral, adds nothing of its own |
| model | `ollama/glm-5.3:cloud`, thinking `high` | same |
| system | the test rules of ritchie | the todo-lines-only rules |
| tools | read, write, edit, grep, find, ls: no bash | same |

Each run works on copies in a temp directory and cannot run code. The body run reads the tests. The script runs `check_body_diff.py` and writes the bodies back only when it passes. Ritchie then runs the tests, the suite and the mutants, and fixes what fails.

## Why

**The earlier runs failed on the model as much as on the method.** `th history` shows that every run of the last attempt used `gemma4:31b-cloud`, the default of that day. The weak tests and the buggy bodies came in part from that. GLM-5.3 is at the level of Kimi K3 on coding benchmarks and costs less than a third per output token on Ollama cloud. The model is fixed in the script, so it does not change when the default of pi changes.

**The setup cost moves into the script.** The last attempt cost a task written by hand for each run, and Ritchie had to explain how `th` works. Now hat, model, thinking, tools and system are written once. To change one, edit the script.

**No runner inside the run.** The worktree with a linked `node_modules` was the part the user judged too complex. A run writes once and stops. The loop that verifies is Ritchie's.

**Where it will likely break.**

- The isolation is soft. A run can read any file by its absolute path. The system tells it to read only its directory and the modules the todo file imports. A trial on the recorder read the real test file of the same module, so that trial says nothing about the quality of GLM. In the normal flow the module is new, and there is no other test or body to read.
- A run takes minutes. In the trial the test file was written after 5 minutes, and the process did not exit for 6 more. The script has a 20-minute timeout. Call it in the background.

## Cross-references

- [.skill_ritchie_step_six_is_direct_tests_first_then_the_body](.skill_ritchie_step_six_is_direct_tests_first_then_the_body) — the direct flow, replaced
- [skill_ritchie_classifiers_get_an_outcome_table](skill_ritchie_classifiers_get_an_outcome_table) — the outcome tables the tests use
