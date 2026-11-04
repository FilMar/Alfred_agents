#!/usr/bin/env bash
# desc: draw the review page: refresh the graph, lay spec.json over it, add review.json
# usage: review_page.sh [--spec <file>] [--review <file>] [--no-open]
set -euo pipefail

readonly graph_timeout_s=300
here=$(cd "$(dirname "$0")" && pwd)
readonly here

die() { printf 'review_page: %s\n' "$1" >&2; exit "${2:-1}"; }
usage() { sed -n 's/^# usage: //p' "$0" >&2; exit 2; }

spec=spec.json review=review.json open=--open
while (($#)); do
    case $1 in
        --spec) spec=${2:?}; shift 2 ;;
        --review) review=${2:?}; shift 2 ;;
        --no-open) open=""; shift ;;
        --help) usage ;;
        *) die "unknown flag: $1" 2 ;;
    esac
done

[[ -f $spec ]] || die "no such file: $spec" 2
[[ -f $review ]] || die "no such file: $review" 2
command -v uv >/dev/null || die "uv not found"

# Without graphify the page shows the spec and the review, with no states.
drawn=$spec
if command -v graphify >/dev/null; then
    over=$(mktemp --suffix=.json)
    trap 'rm -f "$over"' EXIT
    GRAPHIFY_OUT=.graph timeout "$graph_timeout_s" graphify update . >/dev/null
    "$here/overlay.py" --spec "$spec" --graph .graph/graph.json >"$over"
    drawn=$over
fi
"$here/render_page.py" --spec "$drawn" --review "$review" --out "${TMPDIR:-/tmp}/review-page.html" ${open:+"$open"}
