#!/usr/bin/env bash
# Guard for fixed-arity justfile recipes.
#
# just has no named arguments and no unknown-flag errors: it silently maps
# "--what" or "WHAT=x" into positional slots, corrupting the call. This guard
# turns both mistakes into a loud error that teaches the correct usage.
#
# Usage (as the first recipe line, with `set positional-arguments`):
#   @"{{justfile_directory()}}/scripts/guard.sh" 'just save "<what>" "<why>" <kind>' "$@"
set -euo pipefail
usage="$1"; shift
assign=0 total=0
for a in "$@"; do
    case "$a" in
    --*)
        echo "ERROR: flag-style argument '$a' — recipes take positional args only. $usage" >&2
        exit 2
        ;;
    esac
    [ -z "$a" ] && continue  # optional params default to "" — not user input
    total=$((total + 1))
    # NAME=value habit (go-task style): an ALL-CAPS key of length >= 2.
    # Kept narrow so legitimate content like "E=mc2 ..." passes.
    if [[ "$a" =~ ^[A-Z][A-Z0-9_]+= ]]; then assign=$((assign + 1)); fi
done
if [ "$total" -gt 0 ] && [ "$assign" -eq "$total" ]; then
    echo "ERROR: NAME=value arguments — recipes take positional args only. $usage" >&2
    exit 2
fi
