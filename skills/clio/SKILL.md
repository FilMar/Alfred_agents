---
name: clio
description: "Backs up Qdrant to MEGA cloud storage. Use this skill for Qdrant collection snapshots, restoring a collection from a MEGA backup, checking MEGA storage space, and managing the automatic backup timer. Triggers: 'clio', 'backup qdrant', 'qdrant backup', 'snapshot qdrant', 'restore qdrant', 'restore collection', 'backup status', 'backup timer', 'restore from backup'."
---

# Clio Backup Skill

Backs up **Qdrant** to MEGA cloud storage, with an optional systemd timer.

## When to use this skill

- Backing up a Qdrant collection to MEGA (snapshot API -> download -> gzip -> upload)
- Restoring a Qdrant collection from a MEGA backup
- Checking MEGA storage space and login status
- Managing automatic backups (weekly systemd timer)

## Main commands

### Status

```bash
mega-whoami         # Login status
mega-df -h           # Space used
```

### Backup

```bash
scripts/backup_qdrant.sh <collection>          # One collection, retain=5
scripts/backup_qdrant.sh <collection> 10        # Custom retention
scripts/backup_all.sh                           # All collections in QDRANT_COLLECTIONS
```

### Restore

```bash
scripts/restore_qdrant.sh <collection> <backup.tar.gz>
# Example: scripts/restore_qdrant.sh supertest qdrant-supertest-20260728-184022.tar.gz
```

### Timer (automatic backup)

```bash
scripts/enable_timer.sh                          # Enable weekly timer (Monday 04:00)
scripts/disable_timer.sh                         # Disable timer
systemctl --user list-timers clio-backup.timer  # Timer status
journalctl --user -u clio-backup -n 10 --no-pager  # Latest log
```

### Logs

```bash
tail -n 50 "$HOME/.local/log/clio-backup.log"   # Last 50 backup log lines
```

## Architecture

Three-level pattern:
1. **`scripts/backup_qdrant.sh`**: backs up one collection with configurable
   retention (default 5). Usage: `backup_qdrant.sh <collection> [retain]`.
2. **`scripts/backup_all.sh`**: loops over a list of collections and calls
   `backup_qdrant.sh` for each. Edit the `QDRANT_COLLECTIONS` array inside
   the script to customize it.
3. **`scripts/enable_timer.sh`**: installs a systemd user unit that runs
   `scripts/backup_all.sh` every Monday at 04:00. The unit's `ExecStart`
   line must point at this script's absolute path, not at a justfile.

All backups write to `~/.local/log/clio-backup.log`.

## Layout on MEGA

```
/backup/qdrant/
  qdrant-third-brain-20260728-175500.tar.gz
  qdrant-pi_identity-20260728-175500.tar.gz
```

## Extending it

The system is intentionally minimal: one backup script (`backup_qdrant.sh`).

To add other backup types (PostgreSQL, files, Git, etc.), follow this convention:

1. Add a dedicated script under `scripts/` (e.g. `backup_postgres.sh`),
   following the script contract in `skills/efesto/SKILL.md` (Rule 3).
2. Call it from `backup_all.sh`.
3. Log to `$HOME/.local/log/clio-backup.log`.
4. Upload to `/clio/<type>/` on MEGA.

## Configuration

| Variable | Default | Use |
|-----------|---------|-----|
| `CLIO_HOME` | `$HOME/.pi/agent/skills/clio` | Skill path (for `scripts/enable_timer.sh`) |

## Requirements

- **MEGAcmd** installed: `apt install megacmd` (Debian/Ubuntu)
- **Login** done: `mega-login <email>`
- **jq**: `apt install jq` (to parse the Qdrant API response)
- **curl**: standard on Linux
- **Systemd --user**: for the automatic timer

## Resources

- `scripts/` — backup, restore, and timer scripts
- `systemd/clio-backup.service`, `systemd/clio-backup.timer` — timer units
