#!/bin/bash
# Claude hook: search the rules (alfred rules) before each prompt
# Output format matches Claude's hookSpecificOutput schema
#
# The cutoff belongs to the embedding model, not to taste: measured on
# nomic-embed-text-v2-moe, a real prompt tops out around 0.53 and an off-topic one
# never passes 0.25. The old 0.8 came from a model whose scores all sat near 0.7,
# and it fired on none of eight real prompts — the injection was silent.
# 2026-10-21 spike (spikes/2026-10-21-hook-preview + threshold-fix): 0.5 sat on the
# edge of the used-note band (used 0.506-0.600, misses 0.33-0.50). Lowered to 0.3:
# trims the noise tail, empties the rules on conversational prompts, keeps the miss band.
# Below ~0.25 the threshold is a no-op on this corpus (measured cosine floor).
# The search gives up after 1 second: a server that does not answer injects nothing.

input=$(cat)
prompt=$(jq -r '.prompt // empty' <<<"$input")

[ -z "$prompt" ] && exit 0

rules=$(alfred rules search "$prompt" --limit 5 --min-score 0.3 --no-archived --timeout 1000 2>/dev/null)

if [ -n "$rules" ]; then
  context=$'## Rule matches\n'"$rules"
  jq -n --arg ctx "$context" '{hookSpecificOutput: {hookEventName: "UserPromptSubmit", additionalContext: $ctx}}'
fi
