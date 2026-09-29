#!/usr/bin/env bash
# desc: Back up every configured Qdrant collection and the tl archive to MEGA.
# usage: backup_all.sh
set -euo pipefail

# Edit the collections to back up here
QDRANT_COLLECTIONS=(
    "third-brain"
    "pi_identity"
)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "  CLIO BACKUP - $(date)"
echo "========================================"
echo ""

FAILED=()
for COL in "${QDRANT_COLLECTIONS[@]}"; do
    echo ">>> Qdrant: $COL"
    if "$SCRIPT_DIR/backup_qdrant.sh" "$COL"; then
        echo "OK: $COL"
    else
        echo "WARN: $COL failed"
        FAILED+=("$COL")
    fi
    echo ""
done

echo ">>> tl"
if "$SCRIPT_DIR/backup_tl.sh"; then
    echo "OK: tl"
else
    echo "WARN: tl failed"
    FAILED+=("tl")
fi
echo ""

echo "========================================"
if [ ${#FAILED[@]} -eq 0 ]; then
    echo "  FULL BACKUP FINISHED SUCCESSFULLY"
else
    echo "  FULL BACKUP FINISHED WITH ERRORS: ${FAILED[*]}"
    exit 1
fi
echo "========================================"
