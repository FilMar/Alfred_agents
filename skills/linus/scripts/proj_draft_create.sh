#!/usr/bin/env bash
# desc: Create a draft item in SVILUPPO, not linked to a repo issue, status Backlog.
# usage: proj_draft_create.sh <title> <body>
set -euo pipefail

if [ $# -lt 2 ]; then
    echo "usage: proj_draft_create.sh <title> <body>" >&2
    exit 1
fi

TITLE="$1"
BODY="$2"

ITEM_ID=$(gh project item-create 4 --owner Emotion-SRL --title "$TITLE" --body "$BODY" --format json -q .id)
gh project item-edit --id "$ITEM_ID" --project-id PVT_kwDOBGn_Wc4BZ0Ec \
    --field-id PVTSSF_lADOBGn_Wc4BZ0EczhUwJEU \
    --single-select-option-id f75ad846 2>/dev/null
echo "Draft item created in SVILUPPO (Backlog). Item ID: $ITEM_ID"
