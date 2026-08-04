# MEGA Backup Skill

Backup di **Qdrant** su MEGA con timer systemd opzionale. Sistema minimale e
estensibile: un solo recipe di backup (`mega-backup-qdrant`), tutto il resto
si compone a partire da quello.

## Filosofia

- **Minimale**: solo Qdrant, perché è l'unico backup che serve davvero qui.
- **Estensibile**: aggiungere altri tipi (PostgreSQL, file, Git) richiede
  una sola modifica a `mega-backup-all`.
- **Niente wrapper generici**: la skill non wrappa `mega-put`, `mega-ls`,
  ecc. direttamente. Wrappa solo ciò che usa (vedi `SKILL.md`).

## Installazione

1. **Prerequisiti**:
   ```bash
   sudo apt install megacmd jq curl
   ```

2. **Login MEGA** (se non già fatto):
   ```bash
   mega-login <tua-email>
   ```

3. **Verifica**:
   ```bash
   just -f ~/.pi/agent/skills/mega/justfile mega-status
   ```

4. **Backup automatico** (opzionale):
   ```bash
   just -f ~/.pi/agent/skills/mega/justfile mega-enable-timer
   ```
   Timer attivo: ogni lunedì alle 04:00.

## Comandi

I parametri sono **posizionali** (non `key=value`).

### Backup

```bash
# Una collection specifica, retain di default = 5
just mega-backup-qdrant third-brain

# Retention personalizzata
just mega-backup-qdrant third-brain 10

# Tutte le collection configurate (modifica QDRANT_COLLECTIONS in justfile)
just mega-backup-all
```

### Restore

```bash
# Lista i backup disponibili su MEGA
mega-ls /backup/qdrant/

# Ripristina una collection da un backup specifico
just mega-restore-qdrant <collection> <backup_file>
# Esempio:
just mega-restore-qdrant supertest qdrant-supertest-20260728-184022.tar.gz
```

**Attenzione:** il restore sovrascrive la collection esistente (usa `priority=snapshot`). Se esiste già, viene ricreata con i dati del backup. Per una collection nuova viene creata al volo.

### Timer

```bash
just mega-enable-timer      # Abilita timer settimanale
just mega-disable-timer     # Disabilita timer
just mega-timer-status      # Stato e prossima esecuzione
```

### Info e log

```bash
just mega-status            # Login MEGA e spazio disponibile
just mega-logs              # Ultime 50 righe di log
just mega-logs lines=200    # Ultime 200 righe
```

## Configurazione

| Variabile | Default | Uso |
|-----------|---------|-----|
| `MEGA_HOME` | `$HOME/.pi/agent/skills/mega` | Path della skill. Necessario solo per `mega-enable-timer` se la skill è installata in un path non standard. |

Per usare un path diverso:

```bash
MEGA_HOME=/opt/skills/mega just mega-enable-timer
```

## Struttura su MEGA

```
/backup/qdrant/
  qdrant-third-brain-20260728-175500.tar.gz
  qdrant-pi_identity-20260728-175500.tar.gz
  ...
```

## Log

Tutti i backup scrivono in `~/.local/log/mega-backup.log`:

```
[2026-07-28T17:55:00+02:00] Starting Qdrant backup: third-brain
[2026-07-28T17:55:01+02:00] Upload completed: qdrant-third-brain-20260728-175500.tar.gz
[2026-07-28T17:55:01+02:00] Backup completed
```

## Estendere la skill

Per aggiungere un nuovo tipo di backup (es. PostgreSQL):

1. Aggiungi un recipe al justfile:
   ```just
   mega-backup-postgres database="mydb" user="postgres":
       #!/usr/bin/env bash
       set -euo pipefail
       # logica dump + upload
   ```

2. Aggiungilo all'array in `mega-backup-all`:
   ```bash
   if just mega-backup-postgres database=mydb; then ...
   ```

3. Logga in `$HOME/.local/log/mega-backup.log`.

Vedi `SKILL.md` sezione "Estensibilità" per la convenzione completa.

## Note operative

- **Spazio**: account MEGA premium da ~3 TB.
- **Cifratura**: AES-128 lato client, gestita da MEGAcmd.
- **Frequenza**: settimanale di default; il timer è modificabile in
  `systemd/mega-backup.timer`.
- **Sessione MEGA**: persiste in `~/.megaCmd` dopo il primo login.
