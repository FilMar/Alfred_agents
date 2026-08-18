#!/usr/bin/env bash
# desc: List a skill's scripts with their descriptions, read live from each `# desc:` header.
# usage: list_scripts.sh <skill-dir>
set -euo pipefail

if [ $# -ne 1 ]; then
    echo "usage: list_scripts.sh <skill-dir>" >&2
    exit 2
fi

dir="$1/scripts"
if [ ! -d "$dir" ]; then
    echo "no scripts/ folder in $1" >&2
    exit 1
fi

for f in "$dir"/*; do
    [ -f "$f" ] || continue
    case "$(basename "$f")" in
        __init__.py) continue ;;
    esac
    desc="$(sed -n '1,5{s|^# desc: ||p; s|^// desc: ||p}' "$f" | head -1)"
    printf '%s\t%s\n' "$(basename "$f")" "${desc:-(no desc header)}"
done
