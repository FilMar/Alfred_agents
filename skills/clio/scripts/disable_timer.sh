#!/usr/bin/env bash
# desc: Stop and remove the weekly systemd backup timer.
# usage: disable_timer.sh
set -euo pipefail

systemctl --user stop clio-backup.timer || true
systemctl --user disable clio-backup.timer || true
rm -f "$HOME/.config/systemd/user/clio-backup.service" "$HOME/.config/systemd/user/clio-backup.timer"
systemctl --user daemon-reload
echo "Timer disabled."
