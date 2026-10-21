#!/bin/bash
# Claude hook: query Third Identity (ti) and Third Brain (tb) before each prompt
# Output format matches Claude's hookSpecificOutput schema
#
# The cutoff belongs to the embedding model, not to taste: measured on
# nomic-embed-text-v2-moe, a real prompt tops out around 0.53 and an off-topic one
# never passes 0.25. The old 0.8 came from a model whose scores all sat near 0.7,
# and it fired on none of eight real prompts — the injection was silent.
# 2026-10-21 spike (spikes/2026-10-21-hook-preview + threshold-fix): 0.5 sat on the
# edge of the used-note band (used 0.506-0.600, misses 0.33-0.50). Lowered to 0.3:
# trims the noise tail, empties ti on conversational prompts, keeps the miss band.
# Below ~0.25 the threshold is a no-op on this corpus (measured cosine floor).
# Related notes removed: they bypass --min-score via ref-traversal (depth 0).

input=$(cat)
prompt=$(jq -r '.prompt // empty' <<<"$input")

[ -z "$prompt" ] && exit 0

ti_file=$(mktemp)
tb_file=$(mktemp)

ti search "$prompt" --limit 5 --min-score 0.3 --no-archived 2>/dev/null >"$ti_file" &
pid_ti=$!

tb search "$prompt" --depth 0 --limit 5 --min-score 0.3 --no-archived 2>/dev/null >"$tb_file" &
pid_tb=$!

wait "$pid_ti" "$pid_tb"

ti_out=$(cat "$ti_file")
tb_out=$(cat "$tb_file")

rm -f "$ti_file" "$tb_file"

context=""
if [ -n "$ti_out" ]; then
  context+=$'## Third Identity (ti) matches\n'"$ti_out"$'\n\n'
fi
if [ -n "$tb_out" ]; then
  context+=$'## Third Brain (tb) matches\n'"$tb_out"
fi

if [ -n "$context" ]; then
  jq -n --arg ctx "$context" '{hookSpecificOutput: {hookEventName: "UserPromptSubmit", additionalContext: $ctx}}'
fi
