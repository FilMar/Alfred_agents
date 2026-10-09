---
tags: [th, runner, timeout]
sources: [tools/th/src/runner.ts]
---

## Decision

`promptWithTimeout` clears its timer in a `finally`. A run with `--timeout` exits as soon as its prompt ends, not when the timeout fires.

## Why

**A live timer keeps a Bun process up.** The timeout was a `Promise.race` between the prompt and a `setTimeout`. When the prompt won, the timer stayed armed, and the process waited for it. A short run with `--timeout 300` took 300 seconds. With the fix it takes 4.

**It was read as a slow model.** The first trial of `th_write.sh` wrote its file after 5 minutes and did not exit for 6 more. That wait was blamed on the model. The registry run made the cause plain: it lasted 20:01 with a timeout of 1200 seconds, though the file was written after about 2 minutes. Every run of `th_write.sh` paid the whole timeout.

**What a run of `th_write.sh` costs now.** On the registry (component 2 of `td`), the test run wrote 10 tests in about 2 minutes and the body run took 161 seconds. The minutes in [skill_ritchie_step_six_runs_th_through_one_script_with_a_fixed_model_per_role](skill_ritchie_step_six_runs_th_through_one_script_with_a_fixed_model_per_role) include the timer.

## Cross-references

- [skill_ritchie_step_six_runs_th_through_one_script_with_a_fixed_model_per_role](skill_ritchie_step_six_runs_th_through_one_script_with_a_fixed_model_per_role) — the script that hit the bug
- [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) — the other way a run ends
