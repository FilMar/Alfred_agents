#!/usr/bin/env bash
# desc: Start a curation run: save the trust spread, the close pairs and the reach of the rules. Prints the run folder.
# usage: gather.sh [<days of prompts, default 30>]
set -euo pipefail

days="${1:-30}"
if ! [[ "$days" =~ ^[0-9]+$ ]] || [ "$days" -eq 0 ]; then
  echo "usage: gather.sh [<days of prompts, default 30>]" >&2
  exit 2
fi

run="/tmp/aristotele/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$run"

tb refine >"$run/before_tb.json"
ti refine >"$run/before_ti.json"
tb near --min 0.9 --limit 50 >"$run/near_tb.json"
ti near --min 0.85 --limit 50 >"$run/near_ti.json"
tl prompts --since "$(date -d "-$days days" +%Y-%m-%d)" >"$run/prompts.json"
ti reach <"$run/prompts.json" >"$run/reach.json"
: >"$run/actions.jsonl"

echo "$run"
