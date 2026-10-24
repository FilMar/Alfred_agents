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
grep -qE 'throw new Error\(["'"'"'`]todo|todo!\(|raise NotImplementedError|panic\("todo|die "todo' "$todo_file" \
  || { echo "no todo line in $todo_file" >&2; exit 2; }

work="$(mktemp -d -t ritchie-XXXXXX)"
target="$(basename "$todo_file")"
tests_name="$(basename "$test_file")"
import_path="$(python3 -c 'import os,sys; print(os.path.relpath(sys.argv[1], os.path.dirname(sys.argv[2])))' "$todo_file" "$test_file")"
import_rule="The test file will live next to other tests and must import the module as $import_path."
if [ "$mode" = tests ] && [[ "$target" == *.rs ]]; then
  # Rust has no file imports: name the module path from src/ down.
  mod_path="$(python3 -c '
import os, sys
parts = sys.argv[1].split(os.sep)
if "src" not in parts:
    sys.exit(1)
rest = parts[len(parts) - parts[::-1].index("src"):]
rest[-1] = rest[-1][:-3]
if rest[-1] in ("lib", "main", "mod"):
    rest.pop()
print("::".join(["crate"] + rest))
' "$todo_file")" || { echo "no src/ dir above the todo file: $todo_file" >&2; exit 2; }
  import_rule="Import the code under test with use $mod_path::...; and nothing else. Never write #[path] or a mod line for a source file: the tests module already lives inside the crate."
fi
# src/ and test/ keep same-basename files apart: a test file that shares
# the todo file's name must not overwrite the copy the run edits.
src_dir="$work/src"
test_dir="$work/test"
mkdir -p "$src_dir" "$test_dir"
cp "$todo_file" "$src_dir/$target"
cp "$todo_file" "$src_dir/$target.todo"
cp "$spec_file" "$work/spec.md"

RULES_TESTS='You write tests from contracts. You never see a body: every body is a todo line.
An assert above the todo line is a precondition. An assert below it is a postcondition.
- One test per precondition: call with input that breaks it and expect a throw whose message contains the assert message.
- One test per postcondition: a bare call with input that reaches it. No expect of your own: the contract is the oracle.
- The edge values of each threshold and range: at the edge, just inside, just outside.
- A classifier (a pure function whose rule is its own definition): an outcome table with the expected result, from the spec. This is the only place where a test has its own expect.
- Import only what the file exports. Never import or reach a private member.
- Use the test framework and style of the project language.
- The test file holds code only. Write no comment of any kind.
Read only src/, spec.md and the modules the todo file imports. Never read other test files.
Write the test file once and stop. You cannot run it.'

RULES_BODY='You write function bodies. Each body replaces one todo line, in that place only.
- Change no other line: no contract, no signature, no import, no comment. A script compares every other line with the original and rejects the whole file on any change.
- A function with postconditions has no return in its body: assign result and let the postconditions after the todo line run.
- No recursion. Every loop has a bound.
- The tests and the spec say what the body must do. The contracts must hold for every test.
Read only src/, test/ and spec.md. Never read another version of this file.
Edit the file once and stop. You cannot run it.'

if [ "$mode" = tests ]; then
  [ ! -e "$test_file" ] || { echo "test file exists, remove it first: $test_file" >&2; exit 2; }
  hat="$TESTS_HAT"
  system="$RULES_TESTS"
  task="Read src/$target and spec.md. Write the tests as test/$tests_name. $import_rule"
else
  [ -f "$test_file" ] || { echo "no test file: $test_file" >&2; exit 2; }
  cp "$test_file" "$test_dir/$tests_name"
  hat="$BODY_HAT"
  system="$RULES_BODY"
  task="Read test/$tests_name and spec.md. Replace every todo line of src/$target with its body."
fi

(cd "$work" && th run --hat "$hat" --model "$MODEL" --thinking "$THINKING" --tools "$TOOLS" \
  --system "$system" --timeout "$TIMEOUT_S" --task "$task")

if [ "$mode" = tests ]; then
  [ -f "$test_dir/$tests_name" ] || { echo "the run wrote no test file; work dir: $work" >&2; exit 1; }
  cp "$test_dir/$tests_name" "$test_file"
  echo "tests written: $test_file"
  bad="$(grep -nE '#\[path|^[[:space:]]*//' "$test_file" || true)"
  if [ -n "$bad" ]; then
    echo "test file breaks a rule (#[path] or a comment), fix these lines by hand:" >&2
    echo "$bad" >&2
    exit 1
  fi
else
  python3 "$here/check_body_diff.py" "$src_dir/$target.todo" "$src_dir/$target" \
    || { echo "body rejected, $todo_file left as it was; work dir: $work" >&2; exit 1; }
  cp "$src_dir/$target" "$todo_file"
  echo "bodies written: $todo_file"
fi
