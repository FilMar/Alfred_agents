#!/usr/bin/env bash
# desc: Full recap of SVILUPPO status, open PRs, and open branches across Emotion-SRL.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo "       SVILUPPO - Project Recap            "
echo "============================================"
echo
echo "--- STATUS BREAKDOWN ---"
gh project item-list 4 --owner Emotion-SRL --format json 2>/dev/null \
    | python3 "$DIR/recap_status.py"
echo
echo "--- OPEN PULL REQUESTS ---"
PRS=$(gh search prs --owner Emotion-SRL --state open \
    --json repository,number,title,author,updatedAt \
    --jq '.[] | "  \(.repository.nameWithOwner)#\(.number)  \(.title)  (@\(.author.login))  \(.updatedAt[0:10])"' 2>/dev/null || true)
if [ -n "$PRS" ]; then
    echo "$PRS"
else
    echo "  (no open PRs)"
fi
echo
echo "--- OPEN BRANCHES (excluding main/master) ---"
"$DIR/branches.sh"
