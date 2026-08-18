#!/usr/bin/env bash
# desc: Install and start the weekly systemd timer that runs backup_all.sh.
# usage: enable_timer.sh
set -euo pipefail

CLIO_HOME="${CLIO_HOME:-$HOME/.pi/agent/skills/clio}"
if [ ! -d "$CLIO_HOME/systemd" ]; then
    echo "ERROR: directory $CLIO_HOME/systemd not found"
    echo "Set CLIO_HOME or install the skill at its default path"
    exit 1
fi

echo "Enabling weekly backup timer (skill: $CLIO_HOME)..."
mkdir -p "$HOME/.config/systemd/user"
cp "$CLIO_HOME/systemd/clio-backup.service" "$HOME/.config/systemd/user/"
cp "$CLIO_HOME/systemd/clio-backup.timer" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable clio-backup.timer
systemctl --user start clio-backup.timer
echo "Timer enabled and started."
systemctl --user list-timers clio-backup.timer
