#!/usr/bin/env bash
# desc: Terminal line chart of the monthly total for one category or "totale"
# usage: plot.sh <category|totale> [years]
set -euo pipefail

if [ $# -lt 1 ]; then
    echo "usage: plot.sh <category|totale> [years]" >&2
    exit 1
fi

target="$1"
years="${2:-}"
root="${ESSAYS_ROOT:-$HOME/git_projects/essays}"

expr="true"
if [ "$target" != "totale" ]; then
    expr="category eq \"$target\""
fi
if [ -n "$years" ]; then
    years_list=$(echo "$years" | awk -F, '{for(i=1;i<=NF;i++) printf "\"%s\"%s", $i, (i<NF?",":"")}')
    if [ "$expr" = "true" ]; then
        expr="source_year in [$years_list]"
    else
        expr="$expr && source_year in [$years_list]"
    fi
fi

xan filter "$expr" "$root/.bank.csv" | xan plot -LT date amount -g months
