#!/usr/bin/env bash
# desc: Create a GitHub issue and add it to SVILUPPO with status Backlog.
# usage: issue_create.sh <repo> <title> [body]
set -euo pipefail

if [ $# -lt 2 ]; then
    echo "usage: issue_create.sh <repo> <title> [body]" >&2
    exit 1
fi

REPO="$1"
TITLE="$2"
BODY="${3:-}"

if [ -n "$BODY" ]; then
    URL=$(gh issue create --repo "Emotion-SRL/$REPO" --title "$TITLE" --body "$BODY")
else
    URL=$(gh issue create --repo "Emotion-SRL/$REPO" --title "$TITLE")
fi
echo "Issue created: $URL"

ITEM_ID=$(gh project item-add 4 --owner Emotion-SRL --url "$URL" --format json -q .id 2>/dev/null || echo "")
if [ -n "$ITEM_ID" ]; then
    gh project item-edit --id "$ITEM_ID" --project-id PVT_kwDOBGn_Wc4BZ0Ec \
        --field-id PVTSSF_lADOBGn_Wc4BZ0EczhUwJEU \
        --single-select-option-id f75ad846 2>/dev/null
    echo "Added to SVILUPPO (Backlog). Item ID: $ITEM_ID"
else
    echo "Warning: issue created but could not add to SVILUPPO."
    echo "Add manually with: scripts/proj_add.sh $REPO <issue-number>"
fi
