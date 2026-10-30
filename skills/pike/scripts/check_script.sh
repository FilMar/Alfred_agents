#!/usr/bin/env bash
# desc: check a script's header and size, then run its strictest linter
# usage: check_script.sh <file>
set -euo pipefail

readonly shell_lines_max=100
readonly other_lines_max=200

die() { printf 'check_script: %s\n' "$1" >&2; exit "${2:-1}"; }

(($# == 1)) || die "usage: check_script.sh <file>" 2
readonly file=$1
[[ -f $file ]] || die "no such file: $file" 2

failed=false
fail() { printf 'FAIL %s\n' "$1"; failed=true; }

head -n 1 "$file" | grep --quiet '^#!' || fail "no shebang on line 1"
head -n 5 "$file" | grep --quiet 'desc: ' || fail "no desc: line in the first 5 lines"

shebang=$(head -n 1 "$file")
case $file in
    *.sh) kind=shell ;;
    *.py) kind=python ;;
    *) case $shebang in
        *bash* | */sh) kind=shell ;;
        *python* | *uv\ run*) kind=python ;;
        *) kind=other ;;
    esac ;;
esac

lines_max=$other_lines_max
[[ $kind == shell ]] && lines_max=$shell_lines_max
lines=$(wc -l <"$file")
((lines <= lines_max)) || fail "$lines lines, limit $lines_max"

case $kind in
    shell)
        grep --quiet '^set -euo pipefail' "$file" || fail "no set -euo pipefail"
        uvx --quiet --from shellcheck-py shellcheck --enable=all --exclude=SC2250 --severity=style "$file" || fail "shellcheck"
        ;;
    python)
        uvx --quiet ruff check --select ALL --ignore D,T20,INP001,CPY --quiet "$file" || fail "ruff check"
        uvx --quiet ruff format --check --quiet "$file" || fail "ruff format"
        ;;
    *) printf 'SKIP no linter known for %s\n' "$file" ;;
esac

$failed && exit 1
printf 'OK %s\n' "$file"
