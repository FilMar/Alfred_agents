#!/bin/bash
# Claude hook: query Third Identity (ti) and Third Brain (tb) before each prompt
# Output format matches Claude's hookSpecificOutput schema

input=$(cat)
prompt=$(jq -r '.prompt // empty' <<<"$input")

[ -z "$prompt" ] && exit 0

ti_file=$(mktemp)
tb_file=$(mktemp)

ti search "$prompt" --limit 3 --min-score 0.6 2>/dev/null \
  | jq -c '[.[] | {if, do, tags, score}]' >"$ti_file" &
pid_ti=$!

tb search "$prompt" --depth 1 --limit 5 --min-score 0.6 2>/dev/null \
  | jq -c '[.[] | {what: .note.what, why: .note.why, tags: .note.tags, kind: .note.kind, score}]' >"$tb_file" &
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
