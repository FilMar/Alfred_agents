---
name: mega
description: "Backup di Qdrant (e archivi compatibili) su MEGA. Usa questa skill per snapshot di collection Qdrant, ripristino di collection da backup MEGA, monitoraggio spazio MEGA, gestione del timer di backup automatico. Trigger: 'mega', 'backup qdrant su mega', 'qdrant backup', 'backup database vettoriale', 'snapshot qdrant', 'restore qdrant', 'ripristina collection', 'spazio mega', 'stato mega', 'timer backup', 'restore da mega'."
---

# MEGA Backup Skill

Backup di **Qdrant** su MEGA con timer systemd opzionale.

## Quando usare questa skill

- Backup di collection Qdrant su MEGA (snapshot API → download → gzip → upload)
- Restore di una collection Qdrant da un backup MEGA
- Monitoraggio spazio MEGA e stato login
- Gestione backup automatico (timer systemd settimanale)

## Comandi principali

I parametri sono **posizionali**: `just <recipe> <arg1> <arg2>`, non `key=value`.

```bash
# Backup
just mega-backup-qdrant <collection>         # Una collection specifica, retain=5
just mega-backup-qdrant <collection> 10      # Retention personalizzata
just mega-backup-all                         # Tutte le collection in QDRANT_COLLECTIONS

# Restore
just mega-restore-qdrant <collection> <backup.tar.gz>
# Esempio: just mega-restore-qdrant supertest qdrant-supertest-20260728-184022.tar.gz

# Timer (backup automatico)
just mega-enable-timer                      # Abilita timer settimanale (lunedì 04:00)
just mega-disable-timer                     # Disabilita timer
just mega-timer-status                      # Stato timer

# Stato e log
just mega-status                            # Login MEGA e spazio disponibile
just mega-logs [lines=N]                    # Log ultimi N backup
```

## Architettura

Pattern a 3 livelli:
1. **Recipe `mega-backup-qdrant`**: fa una singola collection con retention configurabile (default 5). Sintassi: `just mega-backup-qdrant <collection> [retain]`.
2. **Recipe `mega-backup-all`**: itera su una lista di collection definite nel justfile. Modifica l'array `QDRANT_COLLECTIONS` per personalizzare.
3. **Recipe `mega-enable-timer`**: installa unit systemd user che esegue `mega-backup-all` ogni lunedì alle 04:00.

Tutti i backup scrivono in `~/.local/log/mega-backup.log`.

## Struttura su MEGA

```
/backup/qdrant/
  qdrant-third-brain-20260728-175500.tar.gz
  qdrant-pi_identity-20260728-175500.tar.gz
```

## Estensibilità

Il sistema è intenzionalmente minimale: un solo recipe di backup (`mega-backup-qdrant`).

Per aggiungere altri tipi di backup (PostgreSQL, file, Git, ecc.), la convenzione è:

1. Aggiungere un recipe dedicato al justfile (es. `mega-backup-postgres`)
2. Aggiungerlo all'array di `mega-backup-all`
3. Loggare in `$HOME/.local/log/mega-backup.log`
4. Caricare in `/backup/<tipologia>/` su MEGA

Non aggiungere wrapper generici per `mega-*` nella skill: solo i comandi effettivamente usati.

## Configurazione

| Variabile | Default | Uso |
|-----------|---------|-----|
| `MEGA_HOME` | `$HOME/.pi/agent/skills/mega` | Path della skill (per `mega-enable-timer`) |

## Prerequisiti

- **MEGAcmd** installato: `apt install megacmd` (Debian/Ubuntu)
- **Login** eseguito: `mega-login <email>`
- **jq**: `apt install jq` (per parsing risposta API Qdrant)
- **curl**: di base su Linux
- **Systemd --user**: per il timer automatico

## Risorse

- `justfile` — recipe
- `systemd/mega-backup.service`, `systemd/mega-backup.timer` — unit per timer
- `README.md` — documentazione completa
