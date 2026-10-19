#!/bin/bash
# Claude hook (SessionStart): archive and restore notes by trust.
#
# It never blocks the start of a session and never fails it: tb refine and
# the distiller (distill.sh, which checks the queue itself) run
# detached and the exit code is always 0. The run is idempotent and costs about
# half a second, so there is no check on the time since the last run.
#
# Turn it on by adding a SessionStart entry with the matcher "startup" to
# ~/.claude/settings.json. Without that entry nothing runs.

cat >/dev/null

setsid tb refine --apply >/dev/null 2>&1 &
setsid "$(dirname "$(readlink -f "$0")")/distill.sh" >/dev/null 2>&1 &

exit 0
