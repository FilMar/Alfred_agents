---
tags: [skill, ritchie, th, delegation, tests]
sources: [conversation, tools/td/src/config.ts, tests/td_config.test.ts]
---

## Decision

Step 5 of ritchie runs in two `th run` calls, one after the other, each with its own folder.

1. **Tests, blind.** The folder holds only the file with contracts and `todo` stubs. The run writes the test file and stops. It cannot run code.
2. **Bodies, with the tests.** The folder holds the file, the finished tests and a link to `node_modules` and the sibling tools. The run replaces each `todo`, runs `bun test` and `tsc`, and repeats until both are green. It may not edit the tests. If a test looks wrong, it says which one and why in its last message.

Between the two runs, the owner checks the tests against the `todo` file. A test with a bare call must fail there. A test that passes is a fake.

Both runs use `--hat white-core --no-archive --detach`. The hat or the skill is required. The task is plain text, with no backticks or quotes the shell could run.

The task text carries the rules that broke earlier runs:

- tests call only exported names, never a private function;
- a bare call for valid input, and `toThrow` with a message copied from an assert for invalid input;
- no assert or `expect` of the test's own besides `toThrow`;
- bodies keep every assert, in place, and every signature;
- no comments, no recursion, 40 logic lines at most;
- the stub pair `let result = null as T | null; if (result === null) throw` is replaced by a real `const result`.

## Why

**The first try failed on three things.** Bodies deleted asserts. Tests called private functions and invented messages. Errors showed up only after the run, when the owner had to fix them by hand. Each rule above answers one of those.

**A runner closes the loop.** The body run now finds its own errors. The result of this run on `tools/td/src/config.ts`: 61 asserts identical to the input, no comment, 14 tests green, `tsc` clean, tests unchanged.

**The cost: the runs are no longer independent.** The body run sees the tests. The old rule kept them apart so tests and body could not agree on a wrong behaviour. Here the contracts stay the oracle, and the asserts did not change, so a wrong body would still break its own postcondition. This was chosen on purpose, and it weakens the old guarantee.

**Where it still breaks:**

- A throwing test that builds its inputs with another class cannot be checked against `todo`. It fails there for the wrong reason.
- The bodies took shortcuts the contracts cannot see: a cast to `any`, invented constants, state shared with the caller.
- The test folder is outside the `tsc` project, so a type error in a test is not caught.

## Cross-references

- [skill_ritchie_contract_messages_carry_values](skill_ritchie_contract_messages_carry_values) — the messages the tests copy
- [th_detached_runs_state_in_tmp](th_detached_runs_state_in_tmp) — where a detached run keeps its output
- [agents_skill_forced_not_offered](agents_skill_forced_not_offered) — why `--skill` or `--hat` is required
