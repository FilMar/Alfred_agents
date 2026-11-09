#!/usr/bin/env bash
# desc: draw the setup page: the schema from spec.json and the proposed skeleton from the files
# usage: spec_page.sh [--spec <file>] [--no-open]
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
readonly here

die() { printf 'spec_page: %s\n' "$1" >&2; exit "${2:-1}"; }
usage() { sed -n 's/^# usage: //p' "$0" >&2; exit 2; }

spec=spec.json open=--open
while (($#)); do
    case $1 in
        --spec) spec=${2:?}; shift 2 ;;
        --no-open) open=""; shift ;;
        --help) usage ;;
        *) die "unknown flag: $1" 2 ;;
    esac
done

[[ -f $spec ]] || die "no such file: $spec" 2
command -v uv >/dev/null || die "uv not found"

view=$(mktemp --suffix=.json)
trap 'rm -f "$view"' EXIT
"$here/code_view.py" --spec "$spec" >"$view"
"$here/render_page.py" --spec "$view" --out "${TMPDIR:-/tmp}/spec-page.html" ${open:+"$open"}
