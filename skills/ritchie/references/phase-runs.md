# Tests and body: three runs

After the contracts are approved, the file holds structs, signatures,
contracts and `todo` bodies. Three `th run` calls write. Ritchie reviews
the plan, then checks and fixes the result.

1. **Plan.** One run reads the contracts and writes a test plan in prose.
2. **Tests.** One run writes the tests from the file and the reviewed plan.
3. **Body.** One run replaces each `todo` with a body.

The body run starts at once, next to the plan run. The test run starts
after Ritchie reviews the plan.

## The spec

Before the runs, Ritchie writes `spec.md` in the scratch directory: the
facts the contracts cannot carry. Examples: the rule of each classifier
(a regex, a word list, an order of checks), a field value of a foreign
type. The plan run and the body run both get it. It is spec, not output,
so sharing it keeps the runs independent.

## Commands

Give each run its own scratch directory and its own copy of the file.
`th run` needs a hat: use `white-core`. Check `th run --help` when a flag
fails. Pass a long task with `--task "$(cat <task-file>)"`.

```
SYS="Follow the code rules in <ritchie>/SKILL.md and <ritchie>/references/rules.md. You only write."
th run --hat white-core --system "$SYS" --tools read,write,edit --detach --task "<plan task>"
th run --hat white-core --system "$SYS" --tools read,write,edit --detach --task "<body task>"
# after the plan review:
th run --hat white-core --system "$SYS" --tools read,write,edit --detach --task "<test task>"
```

**Plan task.** In `<dir-P>`, read `<file>` and `spec.md`. Write `plan.md`.
An assert above the todo line is a precondition, one below it is a
postcondition. For each function, list:

- for each precondition, an input that breaks it, and the message to expect;
- for each postcondition, an input that reaches it;
- the edge values of each threshold and range: at the edge, just inside,
  just outside;
- whether the function is a classifier (a pure function whose rule is its
  own definition). For a classifier, write the rows of its outcome table:
  input and expected result, from `spec.md`.

Name only what the file exports. Write the plan and stop.

**Test task.** In `<dir-A>`, write the tests for `<file>` from `plan.md`.
Bare calls for valid input. `expect(() => ...).toThrow(message)` for a
broken precondition. `expect(...).toBe(...)` only for the outcome table
of a classifier. Import only what the file exports. Write the test file
and stop.

**Body task.** In `<dir-B>`, read `spec.md`. Replace each `todo` line in
`<file>` with the body, in the place of that line only. Change no other
line: the contracts, the signatures and the helpers stay as they are. A
function with postconditions has no `return` in its body: assign
`result` and let the postconditions run. Write the file and stop.

- The test run and the plan run never see a body. The body run never sees
  the plan or a test.
- No run runs code or checks anything. They write and stop.
- No run gets the user's intent. It gets the file and `spec.md`.

## Plan review

Ritchie reads `plan.md` before the test run starts. It fixes the plan in
place: a postcondition listed as a panic, an input that never reaches the
check it names, a classifier with no table, a missing edge. A plan is
cheaper to fix than a test file.

## Direct mode

The user can tell Ritchie to write the tests and the body itself, with no
`th` run. Ritchie writes the tests first, from the contracts and the spec
only. Then it writes the body. The checks below still apply, all of them.

## Checks

Ritchie moves the results into the project and checks:

0. The body only replaced the todo lines:
   ```
   scripts/check_body_diff.py <todo-file> <body-file>
   ```
   A failure rejects the body before any test runs.
1. Against the `todo` file, every bare-call test fails and every
   should-panic test passes. A bare-call test that passes against `todo`
   is broken. One exception: a precondition of a private constructor is
   reached only through a factory, such as `fromJson`. Against `todo`, the
   factory stops at its own `todo` first, so that test fails. This is
   expected.
2. Against the body, the whole suite passes.
3. Mutants: one per classifier (invert its result) and one per edge
   comparison (`>=` to `>`). Each mutant must make at least one test
   fail. A mutant that survives means the tests are too weak.

Each run writes once. Ritchie does not repeat a run. It fixes the result
in place:

- A test that breaks the rules (an import of a private name, a
  postcondition expected to panic, a call that never reaches the check it
  names) is rewritten or removed.
- A body that fails check 0 is fixed back into the todo places.
- A body that breaks a contract is fixed at the cause. A contract that
  let a wrong body pass is Ritchie's own gap: fix the contract first, then
  the body.

Then the checks run again. Ritchie tells the user what it fixed and why.
