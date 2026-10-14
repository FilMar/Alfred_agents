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

- **tests:** hat `black-core` (finds the inputs that break the code), with the test rules of ritchie as system.
- **body:** hat `white-core` (neutral, adds nothing of its own), with the todo-lines-only rules.
- **both:** model `ollama/glm-5.3:cloud`, thinking `high`, tools read, write, edit, grep, find and ls. No bash.

Each run works on copies in a temp directory and cannot run code. The body run reads the tests. The script runs `check_body_diff.py` and writes the bodies back only when it passes. Ritchie then runs the tests, the suite and the mutants, and fixes what fails.

## Why

**The earlier runs failed on the model as much as on the method.** Every run of the last attempt used `gemma4:31b-cloud`, the default of that day. GLM-5.3 is at the level of Kimi K3 on coding benchmarks and costs less than a third per output token on Ollama cloud. The model is fixed in the script, so it does not change when the default of pi changes.

**The setup cost moves into the script.** The last attempt cost a task written by hand for each run, and Ritchie had to explain how `th` works. Now hat, model, thinking, tools and system are written once.

**No runner inside the run.** The worktree with a linked `node_modules` was the part the user judged too complex. A run writes once and stops. The loop that verifies belongs to Ritchie.

**Where it will likely break.** The isolation is soft: a run can read any file by its absolute path, and the system only tells it not to. A trial on the recorder read the real test file of the same module, so that trial says nothing about GLM. In the normal flow the module is new. A run takes minutes, and part of the old wait was a timer: [th_timeout_timer_is_cleared_so_a_run_exits_when_its_prompt_ends](th_timeout_timer_is_cleared_so_a_run_exits_when_its_prompt_ends). The script has a 20-minute timeout. Call it in the background.

## Cross-references

- `skill_ritchie_step_six_is_direct_tests_first_then_the_body@c9ffb93` — the direct flow, replaced
- [skill_ritchie_classifiers_get_an_outcome_table](skill_ritchie_classifiers_get_an_outcome_table) — the outcome tables the tests use
