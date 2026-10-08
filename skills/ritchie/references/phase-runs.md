# Tests and body: two independent runs

After the contracts are approved, the file holds structs, signatures,
contracts and `todo` bodies. Ritchie writes nothing in this step. Two
`th run` calls write, and Ritchie checks the result.

The runs must not see each other. Give each one its own copy of the file
in its own scratch directory. `th run` needs a hat: use `white-core`.
Check `th run --help` when a flag fails.

```
th run --hat white-core --system "Follow the code rules in <ritchie>/SKILL.md and <ritchie>/references/rules.md. You only write." --tools read,write,edit --detach \
  --task "In <dir-A> write the tests for <file>. Read the contracts only. An assert above the todo line is a precondition, one below it is a postcondition. Write one test per contract message. A precondition gets an expected panic message, with input that breaks it. A postcondition never panics for a correct body: it gets a bare call with input that reaches it. Add the edge values of each threshold and range: at the edge, just inside, just outside. Import only what the file exports. No assert of your own. Write the test file and stop."
th run --hat white-core --system "Follow the code rules in <ritchie>/SKILL.md and <ritchie>/references/rules.md. You only write." --tools read,write,edit --detach \
  --task "In <dir-B> replace each todo in <file> with the body. Keep every assert. Write the file and stop."
```

- The test run never sees a body. The body run never sees a test.
- Neither run runs code or checks anything. They write and stop.
- Neither run gets the user's intent, only the file. A fact the contracts
  cannot carry (a field value of a foreign type, for example) goes in the
  task as plain text.

## Direct mode

The user can tell Ritchie to write the tests and the body itself, with no
`th` run. Ritchie writes the tests first, from the contracts only, with
the same coverage as the test task above. Then it writes the body. The
checks below still apply, all of them.

## Checks

Ritchie moves both results into the project and checks:

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
- A body that breaks a contract is fixed at the cause. A contract that
  let a wrong body pass is Ritchie's own gap: fix the contract first, then
  the body.
- A classifier gets its outcome table here, written from the spec.

Then the three checks run again. Ritchie tells the user what it fixed and
why.
