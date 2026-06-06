# Roadmap

## Frontmatter

tags: [roadmap, fasi, stato]
sources: [roadmap.md]
updated: 2026-06-06

## Stato fasi

| Fase | Nome | Stato |
|------|------|-------|
| 1 | Third Brain (`tb`) | Completato |
| 2 | Third Hand (`th`) — Flow Engine | In Progress |
| 3 | Integrazione Third Brain | Completato |
| 4 | GTD Task Manager (`td`) | Completato |
| 5 | Career Coach | Pianificata |
| 6 | Metriche per cappello | Pianificata |
| 7 | Server Personale + Remote Agent | Pianificata |

## Phase 2 — dettaglio (in progress)

### 2A — Membro (fatto)
Creazione, lista, get, delete, promote. Flag `--tmp`. Validazione nome. Risoluzione multi-path. `TH_HATS_DIR` env var.

### 2B — Esecuzione singola (fatto)
`th run` con `--thinking`, `--model`, `--detach`, `--timeout`. Sandbox bwrap. File descriptor safety (try/finally). `th models`.

### 2C — Tracking SQLite (fatto, incompleto)
Layer dati SQLite (`~/.pi/th.db`). `th history`, `th get`. 
**Mancante**: metriche aggregate per cappello nel tempo (qualità output, token, durata).

## Phase 5 — Career Coach

Funziona meglio con TB già ricco. Consulterà TB prima di ogni risposta. Non generico — calibrato su storia e obiettivi reali.

## Phase 6 — Metriche per cappello

Base dati già pronta (Phase 2C). Comando `th stats [--member <name>]`.

## Phase 7 — Server Personale

Server self-hosted con container `pi-core` (Qdrant + SQLite) e `openclaw`. Interfaccia Telegram con topic separati (GTD, ThirdBrain, Dev, Recap, Alfred, Files). Backup notturno su Mega via `megacmd`.

## Todo imminente

- [ ] Aggiungere `tw` (Third Wiki) a `setup.sh` — symlink in `~/.local/bin/tw`
- [ ] Aggiungere `tw page create` alla CLI (attualmente le pagine nuove vanno create scrivendo file `.md` direttamente)
- [ ] Metriche aggregate per cappello (`th stats`)

## Riferimenti incrociati

- [architettura](architettura) — overview system
- [agenti](agenti) — skills operative completate
