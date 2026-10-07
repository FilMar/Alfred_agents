# Tests and body: two independent runs

After the contracts are approved, the file holds structs, signatures,
contracts and `todo` bodies. Ritchie writes nothing in this step. Two
`th run` calls write, and Ritchie checks the result.

The runs must not see each other. Give each one its own copy of the file
in its own scratch directory:

```
th run --system "Follow the code rules in <ritchie>/SKILL.md and <ritchie>/references/rules.md. You only write." --tools read,write,edit --detach \
  --task "In <dir-A> write the tests for <file>. Read the contracts only. Bare calls for valid input, expected panic message for invalid input. No assert of your own. Write the test file and stop."
th run --system "Follow the code rules in <ritchie>/SKILL.md and <ritchie>/references/rules.md. You only write." --tools read,write,edit --detach \
  --task "In <dir-B> replace each todo in <file> with the body. Keep every assert. Write the file and stop."
```

- The test run never sees a body. The body run never sees a test.
- Neither run runs code or checks anything. They write and stop.
- Neither run gets the user's intent, only the file.

Then Ritchie moves both results into the project and checks:

1. Against the `todo` file, every bare-call test fails and every
   should-panic test passes. A bare-call test that passes against `todo`
   is broken.
2. Against the body, the whole suite passes.

Ritchie edits neither the tests nor the body. On a failure it shows the
output to the user. The user picks the run to repeat. A repeated run gets
the same input as before, never the other run's output.

