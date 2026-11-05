#!/usr/bin/env bash
# desc: build a feynman lesson page, then check it in Brave and print the screenshots
# usage: lesson.sh --lesson <file> --sources <file> [--clicks <file>] [--words <n>]
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
readonly here

die() { printf 'lesson: %s\n' "$1" >&2; exit "${2:-1}"; }
usage() { sed -n 's/^# usage: //p' "$0" >&2; exit 2; }

lesson="" sources="" words=() clicks=()
while (($#)); do
    case $1 in
        --lesson) lesson=${2:?}; shift 2 ;;
        --sources) sources=${2:?}; shift 2 ;;
        --words) words=(--words "${2:?}"); shift 2 ;;
        --clicks) clicks=(--clicks "${2:?}"); shift 2 ;;
        --help) usage ;;
        *) die "unknown flag: $1" 2 ;;
    esac
done

[[ -n $lesson && -n $sources ]] || usage
command -v uv >/dev/null || die "uv not found"

page=$("$here/lesson_page.py" --lesson "$lesson" --sources "$sources" "${words[@]}")
printf '%s\n' "$page"
"$here/check_page.py" --page "$page" "${clicks[@]}"
