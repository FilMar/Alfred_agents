#!/usr/bin/env bash
# desc: Add an existing issue to SVILUPPO with status Backlog.
# usage: proj_add.sh <repo> <issue_num>
set -euo pipefail

if [ $# -lt 2 ]; then
    echo "usage: proj_add.sh <repo> <issue_num>" >&2
    exit 1
fi

REPO="$1"
ISSUE_NUM="$2"
URL="https://github.com/Emotion-SRL/$REPO/issues/$ISSUE_NUM"

ITEM_ID=$(gh project item-add 4 --owner Emotion-SRL --url "$URL" --format json -q .id 2>/dev/null || echo "")
if [ -n "$ITEM_ID" ]; then
    gh project item-edit --id "$ITEM_ID" --project-id PVT_kwDOBGn_Wc4BZ0Ec \
        --field-id PVTSSF_lADOBGn_Wc4BZ0EczhUwJEU \
        --single-select-option-id f75ad846 2>/dev/null
    echo "Added to SVILUPPO (Backlog). Item ID: $ITEM_ID"
else
    echo "Error: could not add issue to SVILUPPO."
    echo "Check that issue #$ISSUE_NUM exists in Emotion-SRL/$REPO"
    exit 1
fi
