# Tests and body

After the contracts are approved, the file holds structs, signatures,
contracts and `todo` bodies. Two th runs write the rest: one the tests,
one the bodies. Ritchie writes the spec, calls the script, and checks
each result.

```
scripts/th_write.sh tests <todo-file> <spec-file> <test-file>
scripts/th_write.sh body  <todo-file> <spec-file> <test-file>
```

The script fixes the hat, the model, the thinking level, the tools and
the system prompt of each role. Ritchie passes only the files. To change
the model or a rule for a run, edit the script, not the call. A run works
on copies in a temp directory and cannot run code. A run takes minutes:
call the script in the background and wait for it.

## 1. Spec

Write down the facts the contracts cannot carry: the rule of each
classifier (a regex, a word list, an order of checks), a field value of a
foreign type, how to build the input of a test, how a test reaches an
edge that needs I/O. The spec is a file next to the work, never in the
code. A run knows only the todo file, the spec and, for the body, the
tests: what is not written there, the run does not know.

## 2. Tests, before the body

```
scripts/th_write.sh tests <todo-file> <spec-file> <test-file>
```

The test run never sees a body. Check the test file against these rules,
and fix what breaks them:

- A precondition: `expect(() => ...).toThrow(message)`, with input that
  breaks it.
- A postcondition: a bare call with input that reaches it. It never
  panics for a correct body.
- The edge values of each threshold and range: at the edge, just inside,
  just outside.
- A classifier (a pure function whose rule is its own definition): an
  outcome table with the expected result, from the spec.
- Import only what the file exports.

Then run the tests against the `todo` file: every bare-call test fails and
every should-panic test passes. One exception: a precondition of a
private constructor is reached only through a factory, such as
`fromJson`. Against `todo`, the factory stops at its own `todo` first, so
that test fails. This is expected.

## 3. Body, in the todo lines only

```
scripts/th_write.sh body <todo-file> <spec-file> <test-file>
```

The body run reads the tests and the spec. The script runs
`check_body_diff.py` on the result: every line outside the `todo` lines
must be unchanged, and no `return` may skip a postcondition. The script
writes over the todo file only when the check passes.

Then the whole suite passes. A test that fails is fixed only if the test
broke a rule above. Otherwise the body is wrong: Ritchie fixes it in the
`todo` lines only, and runs `check_body_diff.py` again against a saved
copy of the todo file.

A contract that turns out weak, or a signature that is missing, sends the
work back to step 4 or 5 in the file. Then save a new todo copy and run
the tests against it again.

## 4. Mutants

One per classifier (invert its result), one per edge comparison (`>=` to
`>`), and one per field of a function that maps data from one shape to
another (drop the field or swap it with another). Each mutant must make
at least one test fail. A mutant that survives means the tests or the
contracts are too weak: add the missing case or contract, then try the
mutant again.
