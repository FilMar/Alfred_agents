#!/usr/bin/env python3
# desc: Check that a body run only replaced the todo lines: contracts and every other line unchanged, no return that skips a postcondition.
# usage: check_body_diff.py <todo-file> <body-file>
"""The todo file is cut at its todo lines into fixed segments. The body file
must hold the same segments, in the same order, with any lines between
them. Those lines are the bodies. A body that comes right before an assert
(a postcondition) must not hold a return: it would skip the postcondition.
A return inside a nested function (a lambda, a closure, an inner def) is
that function's own return, so it does not count.

Exit 1 on any violation.
"""
import re
import sys
from pathlib import Path

TODO = re.compile(
    r'^\s*(?:throw new Error\(["\'`]todo'
    r'|(?:let [^=]*=\s*)?todo!\('
    r'|raise NotImplementedError'
    r'|panic\("todo)'
)
ASSERT = re.compile(r"^\s*(?:debug_assert|assert|(?:\w+\.)?Assert)\b")
RETURN = re.compile(r"^\s*return\b")
FUNC_HEAD = re.compile(r"(?:=>\s*|\bfunction\b[^{]*|\bfunc\b[^{]*|\bfn\b[^{]*|\|[^|]*\|\s*(?:->[^{]*)?)$")
PY_DEF = re.compile(r"^(\s*)(?:async\s+)?def\s")


def segments(lines):
    result, current, todos = [], [], []
    for n, line in enumerate(lines, 1):
        if TODO.match(line):
            result.append(current)
            todos.append(n)
            current = []
        else:
            current.append(line)
    result.append(current)
    return result, todos


def find_block(lines, block, start):
    if not block:
        return start
    width = len(block)
    for i in range(start, len(lines) - width + 1):
        if lines[i:i + width] == block:
            return i
    return -1


def starts_with_assert(block):
    for line in block:
        if line.strip():
            return bool(ASSERT.match(line))
    return False


def outer_returns(body):
    braces, defs, found = [], [], False
    for line in body:
        indent = len(line) - len(line.lstrip())
        if line.strip():
            while defs and indent <= defs[-1]:
                defs.pop()
        if RETURN.match(line) and "fn" not in braces and not defs:
            found = True
        py_def = PY_DEF.match(line)
        if py_def:
            defs.append(len(py_def.group(1)))
        for i, ch in enumerate(line):
            if ch == "{":
                braces.append("fn" if FUNC_HEAD.search(line[:i]) else "block")
            elif ch == "}" and braces:
                braces.pop()
    return found


def check(todo_lines, body_lines):
    segs, todos = segments(todo_lines)
    errors = []
    if find_block(body_lines, segs[0], 0) != 0:
        return [f"line 1 to {len(segs[0])}: the text before the first todo changed"]
    pos = len(segs[0])
    for k in range(1, len(segs)):
        seg = segs[k]
        at = find_block(body_lines, seg, pos) if k < len(segs) - 1 else len(body_lines) - len(seg)
        if at < pos or body_lines[at:at + len(seg)] != seg:
            errors.append(f"todo at line {todos[k - 1]}: the code after it changed (a contract or a signature was edited)")
            return errors
        body = body_lines[pos:at]
        if any(TODO.match(b) for b in body):
            errors.append(f"todo at line {todos[k - 1]}: still a todo")
        if starts_with_assert(seg) and outer_returns(body):
            errors.append(f"todo at line {todos[k - 1]}: a return in the body skips the postconditions")
        pos = at + len(seg)
    return errors


def main(argv):
    if len(argv) != 3:
        print(__doc__.strip().splitlines()[0], file=sys.stderr)
        print("usage: check_body_diff.py <todo-file> <body-file>", file=sys.stderr)
        return 2
    todo_lines = Path(argv[1]).read_text().splitlines()
    body_lines = Path(argv[2]).read_text().splitlines()
    errors = check(todo_lines, body_lines)
    for e in errors:
        print(e)
    if not errors:
        print("ok: only todo lines were replaced")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
