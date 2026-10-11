#!/bin/bash
# Claude hook (Stop): file the exchange that just ended into the archive.
#
# It never blocks a turn and never fails one: tl runs detached and the exit code
# is always 0. Losing an exchange here costs nothing, because the transcript
# stays on disk for 30 days and `tl ingest --all` picks up whatever is missing —
# an exchange id comes from the transcript, so writing it twice is a no-op.
#
# The payload of a Stop hook carries a transcript path, a session id, or both.
# Either is enough, so this reads whichever is there.

input=$(cat)

transcript=$(jq -r '.transcript_path // empty' <<<"$input")
session=$(jq -r '.session_id // empty' <<<"$input")

if [ -n "$transcript" ]; then
  setsid tl ingest --transcript "$transcript" >/dev/null 2>&1 &
elif [ -n "$session" ]; then
  setsid tl ingest --session "$session" >/dev/null 2>&1 &
fi

exit 0
