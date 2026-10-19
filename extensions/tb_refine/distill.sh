#!/bin/bash
# Distill the pending exchanges when the queue holds at least MIN_PENDING.
#
# Run it detached from a SessionStart hook. One distiller at a time: flock holds
# the lock on a file, and the kernel drops it when the process dies, so a crash or
# a switched-off PC leaves nothing to clean. The log gets one line per start and
# one per skip on the lock; a queue under the threshold writes nothing.

MIN_PENDING=50
MAX_SAVED=100

here=$(dirname "$(readlink -f "$0")")
td_cli="$here/../../tools/td/src/cli.ts"
state="${XDG_STATE_HOME:-$HOME/.local/state}/alfredo"
log="$state/td-distill.log"

mkdir -p "$state" || exit 0

exec 9>"$state/td-distill.lock"
if ! flock -n 9; then
  echo "$(date -Is) skipped: another distiller runs" >>"$log"
  exit 0
fi

pending=$(tl pending --limit "$MIN_PENDING" 2>/dev/null | jq 'length' 2>/dev/null)
[ "$pending" = "$MIN_PENDING" ] || exit 0

echo "$(date -Is) start: at least $MIN_PENDING pending" >>"$log"
bun "$td_cli" distill --active --max-saved "$MAX_SAVED" >/dev/null 2>>"$log"
status=$?
echo "$(date -Is) end: exit $status" >>"$log"
