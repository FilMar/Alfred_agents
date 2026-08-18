#!/usr/bin/env bash
# desc: Restore a Qdrant collection from a backup stored on MEGA.
# usage: restore_qdrant.sh <collection> <backup_file>
set -euo pipefail

if [ $# -lt 2 ] || [ -z "$1" ] || [ -z "$2" ]; then
    echo "usage: restore_qdrant.sh <collection> <backup_file>" >&2
    echo "example: restore_qdrant.sh supertest qdrant-supertest-20260728-184022.tar.gz" >&2
    exit 1
fi

COLLECTION="$1"
BACKUP_FILE="$2"
MEGA_PATH="/backup/qdrant/${BACKUP_FILE}"

command -v curl >/dev/null 2>&1 || { echo "ERROR: curl not installed"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq not installed"; exit 1; }

echo "=== Restoring Qdrant: $COLLECTION <- $BACKUP_FILE ==="

# 1. Check that the backup exists on MEGA
if ! mega-ls /backup/qdrant/ | grep -qx "$BACKUP_FILE"; then
    echo "ERROR: $BACKUP_FILE not found on MEGA at $MEGA_PATH"
    echo "Available backups for this collection:"
    mega-ls /backup/qdrant/ | grep "^qdrant-${COLLECTION}-" || echo "(none)"
    exit 1
fi

# 2. Download the backup
TMPDIR="$HOME/.local/tmp/qdrant-restore"
mkdir -p "$TMPDIR"
LOCAL_ARCHIVE="$TMPDIR/$BACKUP_FILE"
echo "Downloading backup from MEGA..."
if ! mega-get "$MEGA_PATH" "$LOCAL_ARCHIVE"; then
    echo "ERROR: download failed"
    rm -f "$LOCAL_ARCHIVE"
    exit 1
fi

# 3. Decompress
echo "Decompressing..."
EXTRACT_DIR="$TMPDIR/extracted"
rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"
if ! tar -xzf "$LOCAL_ARCHIVE" -C "$EXTRACT_DIR"; then
    echo "ERROR: decompression failed"
    rm -rf "$LOCAL_ARCHIVE" "$EXTRACT_DIR"
    exit 1
fi

# Find the .snapshot file inside the archive (name depends on Qdrant)
SNAPSHOT_FILE=$(find "$EXTRACT_DIR" -name "*.snapshot" -type f | head -1)
if [ -z "$SNAPSHOT_FILE" ]; then
    echo "ERROR: no .snapshot file found in the archive"
    rm -rf "$LOCAL_ARCHIVE" "$EXTRACT_DIR"
    exit 1
fi
echo "Snapshot file: $SNAPSHOT_FILE"

# 4. Check if it already exists (the collection will be overwritten)
EXISTS=$(curl -sf "http://localhost:6333/collections/$COLLECTION" | jq -r '.result.status // empty' 2>/dev/null || true)
if [ -n "$EXISTS" ]; then
    echo "WARNING: collection '$COLLECTION' already exists and will be overwritten."
    echo "Proceeding anyway (priority=snapshot)."
fi

# 5. Upload snapshot via the Qdrant API
echo "Uploading snapshot to Qdrant..."
RESPONSE=$(curl -sf -X POST "http://localhost:6333/collections/${COLLECTION}/snapshots/upload?priority=snapshot&wait=true" \
    -F "snapshot=@${SNAPSHOT_FILE}")
if [ -z "$RESPONSE" ] || ! echo "$RESPONSE" | jq -e '.result == true' >/dev/null; then
    echo "ERROR: upload failed. Response: $RESPONSE"
    rm -rf "$LOCAL_ARCHIVE" "$EXTRACT_DIR"
    exit 1
fi
echo "Upload complete."

# 6. Final check
FINAL=$(curl -sf "http://localhost:6333/collections/$COLLECTION" | jq -r '.result.points_count // "?"')
echo "Collection '$COLLECTION' restored with $FINAL points."

# 7. Cleanup
rm -rf "$LOCAL_ARCHIVE" "$EXTRACT_DIR"
echo "=== Restore complete ==="
