#!/bin/bash
# Claude hook (SessionStart): archive and restore rules by trust.
#
# It never blocks the start of a session and never fails it: the rules refine runs
# detached and the exit code is always 0. The run is idempotent and costs about
# half a second, so there is no check on the time since the last run.
# The distiller runs on the server, after an ingest: nothing to start here.
#
# Turn it on by adding a SessionStart entry with the matcher "startup" to
# ~/.claude/settings.json. Without that entry nothing runs.

cat >/dev/null

setsid alfred rules refine --apply >/dev/null 2>&1 &

exit 0
