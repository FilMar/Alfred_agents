# Tests and body

After the contracts are approved, the file holds structs, signatures,
contracts and `todo` bodies. Ritchie writes the tests, then the body. No
`th` run: a run cost more in setup and fixes than it saved.

## 1. Spec

Write down the facts the contracts cannot carry: the rule of each
classifier (a regex, a word list, an order of checks), a field value of a
foreign type. Keep them next to the work, not in the code.

## 2. Tests, before the body

Write the tests from the contracts and the spec only. No body exists yet,
so the tests cannot copy it. An assert above the `todo` line is a
precondition, one below it is a postcondition.

- A precondition: `expect(() => ...).toThrow(message)`, with input that
  breaks it.
- A postcondition: a bare call with input that reaches it. It never
  panics for a correct body.
- The edge values of each threshold and range: at the edge, just inside,
  just outside.
- A classifier (a pure function whose rule is its own definition): an
  outcome table with the expected result, from the spec.
- Import only what the file exports.

Check: against the `todo` file, every bare-call test fails and every
should-panic test passes. One exception: a precondition of a private
constructor is reached only through a factory, such as `fromJson`.
Against `todo`, the factory stops at its own `todo` first, so that test
fails. This is expected.

## 3. Body, in the todo lines only

Replace each `todo` line with the body, in that place only. Change no
other line. A function with postconditions has no `return` in its body:
assign `result` and let the postconditions run. Save a copy of the `todo`
file first, then check:

```
scripts/check_body_diff.py <todo-copy> <file>
```

Then the whole suite passes. A test that fails is fixed only if the test
broke a rule above. Otherwise the body is wrong.

## 4. Mutants

One per classifier (invert its result) and one per edge comparison (`>=`
to `>`). Each mutant must make at least one test fail. A mutant that
survives means the tests are too weak: add the missing case, then try the
mutant again.
