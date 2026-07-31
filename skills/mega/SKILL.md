---
name: mega
description: "Backs up Qdrant (and compatible archives) to MEGA. Use this skill for Qdrant collection snapshots, restoring a collection from a MEGA backup, checking MEGA storage space, and managing the automatic backup timer. Triggers: 'mega', 'backup qdrant to mega', 'qdrant backup', 'vector database backup', 'snapshot qdrant', 'restore qdrant', 'restore collection', 'mega space', 'mega status', 'backup timer', 'restore from mega'."
---

# MEGA Backup Skill

Backs up **Qdrant** to MEGA, with an optional systemd timer.

## When to use this skill

- Backing up a Qdrant collection to MEGA (snapshot API → download → gzip → upload)
- Restoring a Qdrant collection from a MEGA backup
- Checking MEGA storage space and login status
- Managing automatic backups (weekly systemd timer)

## Main commands

Arguments are **positional**: `just <recipe> <arg1> <arg2>`, not `key=value`.

```bash
# Backup
just mega-backup-qdrant <collection>         # One collection, retain=5
just mega-backup-qdrant <collection> 10      # Custom retention
just mega-backup-all                         # All collections in QDRANT_COLLECTIONS

# Restore
just mega-restore-qdrant <collection> <backup.tar.gz>
# Example: just mega-restore-qdrant supertest qdrant-supertest-20260728-184022.tar.gz

# Timer (automatic backup)
just mega-enable-timer                      # Enable weekly timer (Monday 04:00)
just mega-disable-timer                     # Disable timer
just mega-timer-status                      # Timer status

# Status and logs
just mega-status                            # MEGA login and available space
just mega-logs [lines=N]                    # Last N backup log lines
```

## Architecture

Three-level pattern:
1. **Recipe `mega-backup-qdrant`**: backs up one collection with configurable retention (default 5). Syntax: `just mega-backup-qdrant <collection> [retain]`.
2. **Recipe `mega-backup-all`**: loops over a list of collections defined in the justfile. Edit the `QDRANT_COLLECTIONS` array to customize it.
3. **Recipe `mega-enable-timer`**: installs a systemd user unit that runs `mega-backup-all` every Monday at 04:00.

All backups write to `~/.local/log/mega-backup.log`.

## Layout on MEGA

```
/backup/qdrant/
  qdrant-third-brain-20260728-175500.tar.gz
  qdrant-pi_identity-20260728-175500.tar.gz
```

## Extending it

The system is intentionally minimal: one backup recipe (`mega-backup-qdrant`).

To add other backup types (PostgreSQL, files, Git, etc.), follow this convention:

1. Add a dedicated recipe to the justfile (e.g. `mega-backup-postgres`)
2. Add it to the `mega-backup-all` array
3. Log to `$HOME/.local/log/mega-backup.log`
4. Upload to `/backup/<type>/` on MEGA

Don't add generic `mega-*` wrappers to the skill — only the commands actually used.

## Configuration

| Variable | Default | Use |
|-----------|---------|-----|
| `MEGA_HOME` | `$HOME/.pi/agent/skills/mega` | Skill path (for `mega-enable-timer`) |

## Requirements

- **MEGAcmd** installed: `apt install megacmd` (Debian/Ubuntu)
- **Login** done: `mega-login <email>`
- **jq**: `apt install jq` (to parse the Qdrant API response)
- **curl**: standard on Linux
- **Systemd --user**: for the automatic timer

## Resources

- `justfile` — recipes
- `systemd/mega-backup.service`, `systemd/mega-backup.timer` — timer units
- `README.md` — full documentation
