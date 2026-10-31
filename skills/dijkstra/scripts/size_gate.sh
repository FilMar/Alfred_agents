#!/usr/bin/env bash
# desc: fail if the working tree has more lines than a ref, counting new text files
# usage: size_gate.sh [<ref> [<path>...]]
set -euo pipefail

die() { printf 'size_gate: %s\n' "$1" >&2; exit "${2:-1}"; }

readonly ref=${1:-HEAD}
(($#)) && shift
git rev-parse --verify --quiet "${ref}^{commit}" >/dev/null || die "no such ref: $ref" 2

numstat=$(git diff --numstat "$ref" -- "$@")
untracked=$(git ls-files --others --exclude-standard -- "$@")

added=0 deleted=0
while IFS=$'\t' read -r plus minus path; do
    [[ -z $plus || $plus == - ]] && continue
    printf '%+6d  %s\n' "$((plus - minus))" "$path"
    added=$((added + plus)) deleted=$((deleted + minus))
done <<<"$numstat"

while IFS= read -r path; do
    [[ -n $path ]] || continue
    grep --quiet --binary-files=without-match '' "$path" || continue
    lines=$(wc -l <"$path")
    printf '%+6d  %s (new)\n' "$lines" "$path"
    added=$((added + lines))
done <<<"$untracked"

readonly net=$((added - deleted))
printf 'net %+d lines (+%d -%d)\n' "$net" "$added" "$deleted"
((net <= 0)) || die "the code grew by $net lines"
