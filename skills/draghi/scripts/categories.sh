#!/usr/bin/env bash
# desc: Terminal sparkline of total spending per category, one line each
# usage: categories.sh [years]
set -euo pipefail

years="${1:-}"
root="${ESSAYS_ROOT:-$HOME/git_projects/essays}"

if [ -n "$years" ]; then
    years_list=$(echo "$years" | awk -F, '{for(i=1;i<=NF;i++) printf "\"%s\"%s", $i, (i<NF?",":"")}')
    xan filter "source_year in [$years_list]" "$root/.bank.csv" | xan spark amount -g category
else
    xan spark amount -g category "$root/.bank.csv"
fi
