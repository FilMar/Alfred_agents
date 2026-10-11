#!/bin/bash
# Claude hook: query Third Identity (ti) and Third Brain (tb) before each prompt
# Output format matches Claude's hookSpecificOutput schema
#
# The cutoff belongs to the embedding model, not to taste: measured on
# nomic-embed-text-v2-moe, a real prompt tops out around 0.53 and an off-topic one
# never passes 0.25. The old 0.8 came from a model whose scores all sat near 0.7,
# and it fired on none of eight real prompts — the injection was silent.

input=$(cat)
prompt=$(jq -r '.prompt // empty' <<<"$input")

[ -z "$prompt" ] && exit 0

ti_file=$(mktemp)
tb_file=$(mktemp)

ti search "$prompt" --limit 2 --min-score 0.5 2>/dev/null \
  | jq -c '[.[] | {if, do, tags, score}]' >"$ti_file" &
pid_ti=$!

tb search "$prompt" --depth 1 --limit 2 --min-score 0.5 --related-limit 3 2>/dev/null \
  | jq -c '[.[] | {what: .note.what, why: .note.why, tags: .note.tags, kind: .note.kind, score, via}]' >"$tb_file" &
pid_tb=$!

wait "$pid_ti" "$pid_tb"

ti_out=$(cat "$ti_file")
tb_out=$(cat "$tb_file")

rm -f "$ti_file" "$tb_file"

[ "$ti_out" = "[]" ] && ti_out=""
[ "$tb_out" = "[]" ] && tb_out=""

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
