#!/usr/bin/env bash
# desc: Back up one Qdrant collection to MEGA, with retention.
# usage: backup_qdrant.sh <collection> [retain]
set -euo pipefail

if [ $# -lt 1 ] || [ -z "$1" ]; then
    echo "usage: backup_qdrant.sh <collection> [retain]" >&2
    exit 1
fi

COLLECTION="$1"
RETAIN="${2:-5}"

command -v jq >/dev/null 2>&1 || { echo "ERROR: jq not installed"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "ERROR: curl not installed"; exit 1; }

echo "=== Qdrant backup: $COLLECTION ==="
TMPDIR="$HOME/.local/tmp/qdrant-backup"
LOGFILE="$HOME/.local/log/clio-backup.log"
mkdir -p "$TMPDIR"
mkdir -p "$(dirname "$LOGFILE")"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
echo "[$(date -Iseconds)] Starting Qdrant backup: $COLLECTION" >> "$LOGFILE"

# 1. Create snapshot via API
echo "Creating snapshot..."
SNAP_RESPONSE=$(curl -sf -X POST "http://localhost:6333/collections/$COLLECTION/snapshots")
SNAP_FILE=$(echo "$SNAP_RESPONSE" | jq -r '.result.name // empty')

if [ -z "$SNAP_FILE" ]; then
    echo "[$(date -Iseconds)] ERROR: snapshot creation failed: $SNAP_RESPONSE" >> "$LOGFILE"
    echo "ERROR: could not create snapshot. Response: $SNAP_RESPONSE"
    exit 1
fi
echo "Snapshot created: $SNAP_FILE"

# 2. Download snapshot (Qdrant keeps it in its own storage, not an exposed path)
LOCAL_PATH="$TMPDIR/$SNAP_FILE"
echo "Downloading snapshot locally..."
if ! curl -sf -o "$LOCAL_PATH" "http://localhost:6333/collections/$COLLECTION/snapshots/$SNAP_FILE"; then
    echo "[$(date -Iseconds)] ERROR: snapshot download failed" >> "$LOGFILE"
    rm -f "$LOCAL_PATH"
    exit 1
fi

# 3. Compress
ARCHIVE_NAME="qdrant-${COLLECTION}-${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="$TMPDIR/$ARCHIVE_NAME"
echo "Compressing to $ARCHIVE_NAME..."
tar -czf "$ARCHIVE_PATH" -C "$TMPDIR" "$SNAP_FILE"

# 4. Upload to MEGA
echo "Uploading to MEGA..."
mega-mkdir -p /backup/qdrant 2>/dev/null || true

if mega-put "$ARCHIVE_PATH" /backup/qdrant/; then
    echo "[$(date -Iseconds)] Upload completed: $ARCHIVE_NAME" >> "$LOGFILE"
    echo "Upload complete: /backup/qdrant/$ARCHIVE_NAME"
else
    echo "[$(date -Iseconds)] ERROR: Upload failed" >> "$LOGFILE"
    rm -f "$ARCHIVE_PATH"
    exit 1
fi

# 5. Retention
echo "Applying retention ($RETAIN backups)..."
BACKUP_COUNT=$(mega-ls /backup/qdrant/ 2>/dev/null | grep -c "qdrant-${COLLECTION}-" || echo 0)

if [ "$BACKUP_COUNT" -gt "$RETAIN" ]; then
    TO_DELETE=$((BACKUP_COUNT - RETAIN))
    if [ "$TO_DELETE" -gt 0 ]; then
        echo "Removing $TO_DELETE old backups..."
        mega-ls /backup/qdrant/ | grep "qdrant-${COLLECTION}-" | sort | head -n "$TO_DELETE" | while read -r OLD_BACKUP; do
            [ -n "$OLD_BACKUP" ] || continue
            mega-rm "/backup/qdrant/$OLD_BACKUP"
            echo "[$(date -Iseconds)] Deleted: $OLD_BACKUP" >> "$LOGFILE"
        done
    fi
fi

# 6. Local cleanup
rm -f "$LOCAL_PATH" "$ARCHIVE_PATH"
echo "[$(date -Iseconds)] Backup completed" >> "$LOGFILE"
echo "=== Backup complete ==="
