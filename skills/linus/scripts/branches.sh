#!/usr/bin/env bash
# desc: List open branches, excluding main/master, across all Emotion-SRL repos.
set -euo pipefail

FOUND=0
for repo in $(gh repo list Emotion-SRL --limit 100 --json name -q '.[].name' 2>/dev/null); do
    branches=$(gh api "repos/Emotion-SRL/$repo/branches" --paginate \
        -q '[.[] | select(.name != "main" and .name != "master")] | .[].name' 2>/dev/null || true)
    if [ -n "$branches" ]; then
        FOUND=1
        echo "  $repo:"
        echo "$branches" | sed 's/^/    /'
    fi
done
[ "$FOUND" -eq 0 ] && echo "(no extra branches)"
exit 0
