---
name: clio
description: "Backs up Qdrant to MEGA cloud storage. Use this skill for Qdrant collection snapshots, restoring a collection from a MEGA backup, checking MEGA storage space, and managing the automatic backup timer. Triggers: 'clio', 'backup qdrant', 'qdrant backup', 'snapshot qdrant', 'restore qdrant', 'restore collection', 'backup status', 'backup timer', 'restore from backup'."
---

# Clio Backup Skill

Backs up **Qdrant** to MEGA cloud storage, with an optional systemd timer.

## When to use this skill

- Backing up a Qdrant collection to MEGA (snapshot API → download → gzip → upload)
- Restoring a Qdrant collection from a MEGA backup
- Checking MEGA storage space and login status
- Managing automatic backups (weekly systemd timer)

## Main commands

Arguments are **positional**: `just <recipe> <arg1> <arg2>`, not `key=value`.

```bash
# Backup
just clio-backup-qdrant <collection>         # One collection, retain=5
just clio-backup-qdrant <collection> 10     # Custom retention
just clio-backup-all                         # All collections in QDRANT_COLLECTIONS

# Restore
just clio-restore-qdrant <collection> <backup.tar.gz>
# Example: just clio-restore-qdrant supertest qdrant-supertest-20260728-184022.tar.gz

# Timer (automatic backup)
just clio-enable-timer                      # Enable weekly timer (Monday 04:00)
just clio-disable-timer                     # Disable timer
just clio-timer-status                      # Timer status

# Status and logs
just clio-status                            # MEGA login and available space
just clio-logs [lines=N]                    # Last N backup log lines
```

## Architecture

Three-level pattern:
1. **Recipe `clio-backup-qdrant`**: backs up one collection with configurable retention (default 5). Syntax: `just clio-backup-qdrant <collection> [retain]`.
2. **Recipe `clio-backup-all`**: loops over a list of collections defined in the justfile. Edit the `QDRANT_COLLECTIONS` array to customize it.
3. **Recipe `clio-enable-timer`**: installs a systemd user unit that runs `clio-backup-all` every Monday at 04:00.

All backups write to `~/.local/log/clio-backup.log`.

## Layout on MEGA

```
/clio/qdrant/
  qdrant-third-brain-20260728-175500.tar.gz
  qdrant-pi_identity-20260728-175500.tar.gz
```

## Extending it

The system is intentionally minimal: one backup recipe (`clio-backup-qdrant`).

To add other backup types (PostgreSQL, files, Git, etc.), follow this convention:

1. Add a dedicated recipe to the justfile (e.g. `clio-backup-postgres`)
2. Add it to the `clio-backup-all` array
3. Log to `$HOME/.local/log/clio-backup.log`
4. Upload to `/clio/<type>/` on MEGA

## Configuration

| Variable | Default | Use |
|-----------|---------|-----|
| `CLIO_HOME` | `$HOME/.pi/agent/skills/clio` | Skill path (for `clio-enable-timer`) |

## Requirements

- **MEGAcmd** installed: `apt install megacmd` (Debian/Ubuntu)
- **Login** done: `mega-login <email>`
- **jq**: `apt install jq` (to parse the Qdrant API response)
- **curl**: standard on Linux
- **Systemd --user**: for the automatic timer

## Resources

- `justfile` — recipes
- `systemd/clio-backup.service`, `systemd/clio-backup.timer` — timer units
