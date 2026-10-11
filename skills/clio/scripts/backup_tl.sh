#!/usr/bin/env bash
# desc: Back up the tl SQLite archive to MEGA, with retention.
# usage: backup_tl.sh [retain]
set -euo pipefail

RETAIN="${1:-5}"
DB="${TL_DB:-$HOME/.tl/tl.db}"

command -v sqlite3 >/dev/null 2>&1 || { echo "ERROR: sqlite3 not installed"; exit 1; }
[ -f "$DB" ] || { echo "ERROR: tl database not found: $DB"; exit 1; }

echo "=== tl backup: $DB ==="
TMPDIR="$HOME/.local/tmp/tl-backup"
LOGFILE="$HOME/.local/log/clio-backup.log"
mkdir -p "$TMPDIR"
mkdir -p "$(dirname "$LOGFILE")"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
COPY="$TMPDIR/tl-${TIMESTAMP}.db"
ARCHIVE_NAME="tl-${TIMESTAMP}.db.gz"
ARCHIVE_PATH="$TMPDIR/$ARCHIVE_NAME"
echo "[$(date -Iseconds)] Starting tl backup: $DB" >> "$LOGFILE"

# 1. Consistent copy. A plain cp of a WAL database can miss what is still in the -wal file.
echo "Copying with sqlite3 .backup..."
if ! sqlite3 "$DB" ".backup '$COPY'"; then
    echo "[$(date -Iseconds)] ERROR: tl .backup failed" >> "$LOGFILE"
    rm -f "$COPY"
    exit 1
fi

# 2. Check the copy before it replaces anything on MEGA
CHECK=$(sqlite3 "$COPY" "PRAGMA integrity_check")
if [ "$CHECK" != "ok" ]; then
    echo "[$(date -Iseconds)] ERROR: tl copy failed integrity_check: $CHECK" >> "$LOGFILE"
    echo "ERROR: the copy is corrupt: $CHECK"
    rm -f "$COPY"
    exit 1
fi

# 3. Compress
echo "Compressing to $ARCHIVE_NAME..."
gzip -c "$COPY" > "$ARCHIVE_PATH"
rm -f "$COPY"

# 4. Upload to MEGA
echo "Uploading to MEGA..."
mega-mkdir -p /backup/tl 2>/dev/null || true

if mega-put "$ARCHIVE_PATH" /backup/tl/; then
    echo "[$(date -Iseconds)] Upload completed: $ARCHIVE_NAME" >> "$LOGFILE"
    echo "Upload complete: /backup/tl/$ARCHIVE_NAME"
else
    echo "[$(date -Iseconds)] ERROR: Upload failed" >> "$LOGFILE"
    rm -f "$ARCHIVE_PATH"
    exit 1
fi

# 5. Retention
echo "Applying retention ($RETAIN backups)..."
BACKUP_COUNT=$(mega-ls /backup/tl/ 2>/dev/null | grep -c "^tl-" || true)

if [ "$BACKUP_COUNT" -gt "$RETAIN" ]; then
    TO_DELETE=$((BACKUP_COUNT - RETAIN))
    echo "Removing $TO_DELETE old backups..."
    mega-ls /backup/tl/ | grep "^tl-" | sort | head -n "$TO_DELETE" | while read -r OLD_BACKUP; do
        [ -n "$OLD_BACKUP" ] || continue
        mega-rm "/backup/tl/$OLD_BACKUP"
        echo "[$(date -Iseconds)] Deleted: $OLD_BACKUP" >> "$LOGFILE"
    done
fi

# 6. Local cleanup
rm -f "$ARCHIVE_PATH"
echo "[$(date -Iseconds)] tl backup completed" >> "$LOGFILE"
echo "=== Backup complete ==="
