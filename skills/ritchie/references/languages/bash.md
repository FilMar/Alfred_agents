# Bash

Answers to `references/adapting-a-language.md`, with code shapes.
Bash has no types and no structs. A script is glue: the state it works
on lives in another process (tmux, git, the file system). That process
is the owner (P1). The script reads that state, and it changes it only
through the owner's own commands.

## 1. Immutability

There are no values to protect, only strings. A name that must not
change is `local -r` or `readonly`. The script keeps no state of its
own between calls. It asks the owner every time.

```bash
local -r client=$1
```

## 2. Contract

Two helpers. `assert` takes the message, then one command: `test`, or
a predicate function. Exit code 70 (EX_SOFTWARE) marks a broken
contract. Nothing can turn the check off: it is always live.

```bash
die() { printf '%s\n' "$1" >&2; exit 70; }
assert() { local -r msg=$1; shift; "$@" || die "$msg"; }

assert "rename_window: name not empty" test -n "$name"
```

A function that returns a value sets `result`, runs its
postconditions, then prints `result`. A world error exits after the
body with `[[ -n $result ]] || return 1`.

## 3. Construction

Positional arguments with defaults. A missing argument is asked for,
or taken from the owner (P4):

```bash
local -r name=${1:-$(ask "name > " "$(tmux display -p '#W')")}
```

## 4. Stub

```bash
die "todo: fn_name"
```

## 5. Panic test

A plain bash test file, no framework. Each test runs in a subshell.
`expect_die` matches the message by substring.

```bash
expect_die() {
    local -r msg=$1; shift
    local err
    err=$( ("$@") 2>&1 >/dev/null ) && fail "$msg: no die"
    [[ $err == *"$msg"* ]] || fail "$msg: got $err"
}

test_rename_window_keeps_name() { rename_window logs; }
test_rename_window_rejects_empty() {
    expect_die "rename_window: name not empty" rename_window ""
}
```

A test that needs the owner gets a private one. For tmux that is a
server on its own socket (`tmux -L test -f /dev/null`), killed at the
end.

## 6. World error

A non-zero return code, usually 1, with no message. The user pressing
ESC in fzf is a world error: the caller stops quietly.

```bash
choice=$(pick "win > " < list) || return 1
```

## 7. Error types

Two exit codes: 1 for the world, 70 for a broken contract. There are
no other types.

## 8. Inheritance

None. A shared step is a function the actions call.

## Worked example

```bash
die() { printf '%s\n' "$1" >&2; exit 70; }
assert() { local -r msg=$1; shift; "$@" || die "$msg"; }

window_label() {
    assert "window_label: index is a number" is_index "$1"
    assert "window_label: name not empty" test -n "$2"
    local result=""
    die "todo: window_label"
    assert "window_label: label starts with index" test "${result%%:*}" = "$1"
    printf '%s\n' "$result"
}

test_window_label_valid() { window_label 3 nvim >/dev/null; }
test_window_label_rejects_word() {
    expect_die "window_label: index is a number" window_label x nvim
}
```
