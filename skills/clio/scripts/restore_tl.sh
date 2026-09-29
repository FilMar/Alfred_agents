#!/usr/bin/env bash
# desc: Restore the tl SQLite archive from a backup stored on MEGA.
# usage: restore_tl.sh <backup_file>
set -euo pipefail

if [ $# -lt 1 ] || [ -z "$1" ]; then
    echo "usage: restore_tl.sh <backup_file>" >&2
    echo "example: restore_tl.sh tl-20260929-040000.db.gz" >&2
    exit 1
fi

BACKUP_FILE="$1"
DB="${TL_DB:-$HOME/.tl/tl.db}"

command -v sqlite3 >/dev/null 2>&1 || { echo "ERROR: sqlite3 not installed"; exit 1; }

echo "=== Restoring tl: $DB <- $BACKUP_FILE ==="

if ! mega-ls /backup/tl/ | grep -qx "$BACKUP_FILE"; then
    echo "ERROR: $BACKUP_FILE not found on MEGA at /backup/tl/"
    echo "Available backups:"
    mega-ls /backup/tl/ | grep "^tl-" || echo "(none)"
    exit 1
fi

# The service holds the file open: stop it first, or the restore is overwritten
if systemctl --user is-active --quiet tl 2>/dev/null; then
    echo "ERROR: the tl service is running. Stop it first: systemctl --user stop tl"
    exit 1
fi

TMPDIR="$HOME/.local/tmp/tl-restore"
mkdir -p "$TMPDIR"
LOCAL_ARCHIVE="$TMPDIR/$BACKUP_FILE"
LOCAL_DB="$TMPDIR/restored.db"

echo "Downloading backup from MEGA..."
if ! mega-get "/backup/tl/$BACKUP_FILE" "$LOCAL_ARCHIVE"; then
    echo "ERROR: download failed"
    rm -f "$LOCAL_ARCHIVE"
    exit 1
fi

gunzip -c "$LOCAL_ARCHIVE" > "$LOCAL_DB"
CHECK=$(sqlite3 "$LOCAL_DB" "PRAGMA integrity_check")
if [ "$CHECK" != "ok" ]; then
    echo "ERROR: the backup is corrupt: $CHECK"
    rm -f "$LOCAL_ARCHIVE" "$LOCAL_DB"
    exit 1
fi

# Keep what is there: a restore that replaces a newer file must be undoable
mkdir -p "$(dirname "$DB")"
if [ -f "$DB" ]; then
    SAVED="$DB.before-restore-$(date +%Y%m%d-%H%M%S)"
    mv "$DB" "$SAVED"
    echo "Previous database kept as $SAVED"
fi
rm -f "$DB-wal" "$DB-shm"
mv "$LOCAL_DB" "$DB"

SESSIONS=$(sqlite3 "$DB" "SELECT count(*) FROM sessions")
EXCHANGES=$(sqlite3 "$DB" "SELECT count(*) FROM exchanges")
echo "Restored: $SESSIONS sessions, $EXCHANGES exchanges. Start the service: systemctl --user start tl"

rm -f "$LOCAL_ARCHIVE"
echo "=== Restore complete ==="
