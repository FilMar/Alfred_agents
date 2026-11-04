#!/usr/bin/env bash
# desc: draw the dijkstra report page: find the holes in cuts.json, then render it
# usage: cuts_page.sh --cuts <file> [--no-open]
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
readonly here

die() { printf 'cuts_page: %s\n' "$1" >&2; exit "${2:-1}"; }
usage() { sed -n 's/^# usage: //p' "$0" >&2; exit 2; }

cuts="" open=--open
while (($#)); do
    case $1 in
        --cuts) cuts=${2:?}; shift 2 ;;
        --no-open) open=""; shift ;;
        --help) usage ;;
        *) die "unknown flag: $1" 2 ;;
    esac
done

[[ -n $cuts ]] || usage
[[ -f $cuts ]] || die "no such file: $cuts" 2
command -v uv >/dev/null || die "uv not found"

data=$(mktemp --suffix=.json)
trap 'rm -f "$data"' EXIT
"$here/cut_holes.py" --cuts "$cuts" >"$data"
"$here/render_cuts.py" --data "$data" ${open:+"$open"}
