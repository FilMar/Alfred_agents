#!/usr/bin/env bash
# desc: Run one th member that writes the tests or the bodies of a todo file. Hat, model, thinking and system are fixed per role.
# usage: th_write.sh tests|body <todo-file> <spec-file> <test-file>
#
# tests: the run reads the todo file and the spec, and writes <test-file>.
#        The script refuses to overwrite an existing test file.
# body:  the run reads the tests and the spec, and replaces the todo lines
#        of a copy. The copy goes back over <todo-file> only when
#        check_body_diff.py passes. Otherwise the file is left as it was.
#
# The run works in a temp directory on copies. It cannot run code.
set -euo pipefail

TESTS_HAT="black-core"
BODY_HAT="white-core"
MODEL="ollama/glm-5.3:cloud"
THINKING="high"
TOOLS="read,write,edit,grep,find,ls"
TIMEOUT_S=1200

usage() {
  echo "usage: th_write.sh tests|body <todo-file> <spec-file> <test-file>" >&2
  exit 2
}

[ $# -eq 4 ] || usage
mode="$1"
todo_file="$(realpath "$2")"
spec_file="$(realpath "$3")"
test_file="$(realpath -m "$4")"
here="$(cd "$(dirname "$0")" && pwd)"

case "$mode" in tests|body) ;; *) usage ;; esac
[ -f "$todo_file" ] || { echo "no todo file: $todo_file" >&2; exit 2; }
[ -f "$spec_file" ] || { echo "no spec file: $spec_file" >&2; exit 2; }
grep -qE 'throw new Error\(["'"'"'`]todo|todo!\(|raise NotImplementedError|panic\("todo' "$todo_file" \
  || { echo "no todo line in $todo_file" >&2; exit 2; }

work="$(mktemp -d -t ritchie-XXXXXX)"
target="$(basename "$todo_file")"
tests_name="$(basename "$test_file")"
import_path="$(python3 -c 'import os,sys; print(os.path.relpath(sys.argv[1], os.path.dirname(sys.argv[2])))' "$todo_file" "$test_file")"
cp "$todo_file" "$work/$target"
cp "$todo_file" "$work/$target.todo"
cp "$spec_file" "$work/spec.md"

RULES_TESTS='You write tests from contracts. You never see a body: every body is a todo line.
An assert above the todo line is a precondition. An assert below it is a postcondition.
- One test per precondition: call with input that breaks it and expect a throw whose message contains the assert message.
- One test per postcondition: a bare call with input that reaches it. No expect of your own: the contract is the oracle.
- The edge values of each threshold and range: at the edge, just inside, just outside.
- A classifier (a pure function whose rule is its own definition): an outcome table with the expected result, from the spec. This is the only place where a test has its own expect.
- Import only what the file exports. Never import or reach a private member.
- Use the test framework and style of the project language.
Read only the files in this directory and the modules the todo file imports. Never read other test files.
Write the test file once and stop. You cannot run it.'

RULES_BODY='You write function bodies. Each body replaces one todo line, in that place only.
- Change no other line: no contract, no signature, no import, no comment. A script compares every other line with the original and rejects the whole file on any change.
- A function with postconditions has no return in its body: assign result and let the postconditions after the todo line run.
- No recursion. Every loop has a bound.
- The tests and the spec say what the body must do. The contracts must hold for every test.
Read only the files in this directory and the modules the todo file imports. Never read another version of this file.
Edit the file once and stop. You cannot run it.'

if [ "$mode" = tests ]; then
  [ ! -e "$test_file" ] || { echo "test file exists, remove it first: $test_file" >&2; exit 2; }
  hat="$TESTS_HAT"
  system="$RULES_TESTS"
  task="Read $target and spec.md in this directory. Write the tests to $tests_name in this directory. The test file will live next to other tests and must import the module as $import_path."
else
  [ -f "$test_file" ] || { echo "no test file: $test_file" >&2; exit 2; }
  cp "$test_file" "$work/$tests_name"
  hat="$BODY_HAT"
  system="$RULES_BODY"
  task="Read $tests_name and spec.md in this directory. Replace every todo line of $target in this directory with its body."
fi

(cd "$work" && th run --hat "$hat" --model "$MODEL" --thinking "$THINKING" --tools "$TOOLS" \
  --system "$system" --timeout "$TIMEOUT_S" --no-archive --task "$task")

if [ "$mode" = tests ]; then
  [ -f "$work/$tests_name" ] || { echo "the run wrote no test file; work dir: $work" >&2; exit 1; }
  cp "$work/$tests_name" "$test_file"
  echo "tests written: $test_file"
else
  python3 "$here/check_body_diff.py" "$work/$target.todo" "$work/$target" \
    || { echo "body rejected, $todo_file left as it was; work dir: $work" >&2; exit 1; }
  cp "$work/$target" "$todo_file"
  echo "bodies written: $todo_file"
fi
